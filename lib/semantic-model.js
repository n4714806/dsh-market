// One model call with explicit provenance and bounded waiting. Never mix reasoning into JSON.
export async function semanticModel(ctx, prompt, {timeoutMs=45000}={}) {
  const defaults=ctx.get('agentDefaultModel');
  const llm=ctx.get('llm');
  const selection=defaults?.currentSelection();
  const identity={provider:selection?.provider ?? null,model:selection?.model ?? null};
  if (!llm || !selection?.provider || !selection?.model) return {text:'',ai:{...identity,status:'unavailable',reason:'未設定可用的全域預設模型；已使用一般搜尋。'}};
  const controller=new AbortController();
  let timer;
  const consume=async()=>{
    let text='';
    for await (const chunk of llm.stream({...selection,signal:controller.signal,messages:[{role:'user',content:[{type:'text',text:prompt}]}]})) {
      if(chunk?.type==='text-delta' && typeof chunk.text==='string') text+=chunk.text;
      if(chunk?.type==='finish' && ['error','aborted','max-tokens'].includes(chunk.reason?.kind)) throw new Error('model-failed');
    }
    return text;
  };
  try {
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'));},timeoutMs);});
    const text=await Promise.race([consume(),timeout]);
    return {text,ai:{...identity,status:'used',reason:null}};
  } catch(error) {
    return {text:'',ai:{...identity,status:'fallback',reason:error?.message==='timeout'?'AI 搜尋逾時；已使用一般搜尋。':'AI 模型呼叫未成功；已使用一般搜尋。'}};
  } finally {clearTimeout(timer);controller.abort();}
}
