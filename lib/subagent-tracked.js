// Inspected contract: startActivation -> {childId: SessionId, result: Promise, dispose}.
// Legacy provider run.id is deliberately NOT treated as a browser session id.
export class AttentionError extends Error {}
export function listParents(ctx) {
  return {parents:(ctx.get('agents')?.roots?.() ?? []).map(agent => ({id:agent.id,label:agent.id}))};
}
export async function startTrackedSubagent(ctx, {parentSessionId, prompt, label, signal, timeoutMs = 10000}) {
  const agents = ctx.get('agents');
  const parent = parentSessionId && agents?.get?.(parentSessionId);
  if (!parent || !(agents.roots?.() ?? []).includes(parent)) throw new AttentionError('請明確選擇仍在執行的父會話；尚未啟動 AI。');
  const service = ctx.get('subagents');
  const query = ctx.get('sessionQuery');
  if (!service?.startActivation || !service.list().includes('spawn') || !query?.readSession) throw new AttentionError('目前無可靠的本機子代理與結果觀察服務；尚未啟動 AI。');
  const controller = new AbortController();
  const combined = AbortSignal.any([signal,controller.signal]);
  let timer;
  const stopped = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new AttentionError('AI 啟動逾時；已請求停止，請檢查父會話。')); }, timeoutMs);
  });
  let run;
  const starting = Promise.resolve().then(() => service.startActivation({provider:'spawn',label,request:{parent,prompt:[{type:'text',text:prompt}]},signal:combined,delivery:'caller'}));
  // A timeout does not lose the eventual activation: dispose late success and consume rejection.
  starting.then(late => { if (combined.aborted) return late.dispose(); }, () => {}).catch(() => {});
  try {
    run = await Promise.race([starting,stopped]);
    if (!run || typeof run.childId !== 'string' || !run.childId || !run.result || typeof run.result.then !== 'function' || typeof run.dispose !== 'function') throw new AttentionError('子代理未提供可觀察結果；不能宣稱已委派。');
    // Attach immediately so a rejection while validating the session cannot become unhandled.
    run.result.catch(() => {});
    const snapshot = await Promise.race([query.readSession(run.childId),stopped]);
    if (snapshot?.session?.id !== run.childId) throw new AttentionError('無法確認子代理的真實會話；已請求停止。');
    combined.throwIfAborted();
    return {childSessionId:run.childId,result:run.result,dispose:() => run.dispose(),interrupt:() => service.interrupt(run.childId,{kind:'ancestor',agent:parent})};
  } catch (error) {
    controller.abort();
    if (run?.dispose) void run.dispose().catch(() => {});
    throw error;
  } finally { clearTimeout(timer); }
}

export async function awaitTrackedResult(run, signal, timeoutMs = 600000) {
  let timer, abort;
  const stopped = new Promise((_,reject) => {
    abort = () => reject(new AttentionError('已請求取消；子代理停止狀態尚待確認。'));
    signal.addEventListener('abort',abort,{once:true});
    timer = setTimeout(() => reject(new AttentionError('子代理結果逾時；已請求停止，請檢查會話。')), timeoutMs);
    if (signal.aborted) abort();
  });
  try { return await Promise.race([run.result,stopped]); }
  catch (error) { void Promise.resolve().then(() => run.interrupt()).catch(() => {}); throw error; }
  finally {
    clearTimeout(timer); signal.removeEventListener('abort',abort);
    // Disposal can wait indefinitely in a broken provider; don't mask the recorded timeout.
    void run.dispose().catch(() => {});
  }
}
