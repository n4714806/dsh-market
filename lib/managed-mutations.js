import { requireTargetProfile } from './profile-runtime.js';
const success=r=>r && !r.error && ['applied','restart-required'].includes(r.application) && !r.pendingBuilds?.length;
const diagnostic=r=>r?.pendingBuilds?.length?`需要明確批准建置腳本：${r.pendingBuilds.join(', ')}；請使用內建外掛管理。`:r?.error?.diagnostic||r?.error?.code||`宿主操作未完成：${r?.application ?? 'unknown'}`;
const running=new Set();
async function withBundle(ctx,name,args,run) {
  const profile=requireTargetProfile(ctx,args.targetProfile);
  const manager=ctx.get('pluginManager');
  if (!manager) throw new Error('宿主插件管理器不可用。');
  if(name==='@dsh-market/plugin') throw new Error('不能在市場自己的請求內更新或移除市場；請使用內建外掛管理。');
  const bundle=(await manager.listBundles()).find(b=>b.name===name && b.installed && b.availability==='profile');
  if(!bundle || !bundle.removable) throw new Error('目前 profile 沒有可移除的這個套件，或套件受宿主保護。');
  const key=JSON.stringify([profile.dir,name]);
  if(running.has(key))throw new Error('此套件已有管理操作進行中，請等待結果。');
  running.add(key);
  try{return await run(manager,bundle);}finally{running.delete(key);}
}
export async function managedRemove(ctx,name,args={}) {
  return withBundle(ctx,name,args,async(manager,bundle)=>{
    const result=await manager.removeBundle(bundle.name);
    return {ok:success(result),applied:success(result),application:result.application,warnings:result.warnings??[],error:success(result)?null:diagnostic(result)};
  });
}
export async function managedUpdate(ctx,name,args={}) {
  return withBundle(ctx,name,args,async(manager,bundle)=>{
    // The current Host has no atomic replace API. Limit automatic remove/reinstall
    // to registry packages with an exact recoverable installed version.
    const registryName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
    const source=bundle.source??'';
    const registrySource=source===bundle.name||(source.startsWith(bundle.name+'@') && /^[0-9A-Za-z.*~^+|<>= -]+$/.test(source.slice(bundle.name.length+1)));
    if(!registryName.test(bundle.name)||!registrySource||!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(bundle.version??''))return {ok:false,applied:false,needsManual:true,error:'此來源不是可精確還原的 registry 套件；未移除任何內容。請使用內建外掛管理更新。'};
    const newSpec=bundle.name+'@latest';
    const oldSpec=bundle.name+'@'+bundle.version;
    const check=await manager.inspect(newSpec);
    if(check.status==='refused'&&check.problem!=='already-installed')return {ok:false,applied:false,error:check.reason};
    const removed=await manager.removeBundle(bundle.name);
    if(!success(removed))return {ok:false,applied:false,application:removed.application,error:diagnostic(removed)};
    let result;
    try{result=await manager.installBundle(newSpec,{enabled:bundle.enabled,saveExact:true});}
    catch(error){result={application:'failed',error:{diagnostic:error instanceof Error?error.message:String(error)}};}
    if(success(result))return {ok:true,applied:true,application:result.application,warnings:result.warnings??[],version:result.version,enabled:bundle.enabled};
    // An unsuccessful activation may leave a new installed package. Only remove
    // the exact same name before restoring; never touch unrelated bundles.
    let rollback={attempted:true,ok:false};
    try {
      const present=(await manager.listBundles()).find(b=>b.name===bundle.name&&b.installed);
      if(present){const cleanup=await manager.removeBundle(bundle.name);if(!success(cleanup))throw new Error(diagnostic(cleanup));}
      const restored=await manager.installBundle(oldSpec,{enabled:bundle.enabled,saveExact:true});
      rollback={attempted:true,ok:success(restored),application:restored.application,...(!success(restored)?{error:diagnostic(restored)}:{})};
    }catch(error){rollback.error=error instanceof Error?error.message:String(error);}
    return {ok:false,applied:false,application:result.application,error:diagnostic(result),rollback};
  });
}

export async function managedVerify(ctx,name) {
  requireTargetProfile(ctx);
  const manager=ctx.get('pluginManager');
  if(!manager)throw new Error('宿主插件管理器不可用。');
  const bundle=(await manager.listBundles()).find(b=>b.name===name&&b.installed);
  if(!bundle)return {state:'broken',reasons:['目前 profile 未安裝此套件']};
  if(!bundle.enabled)return {state:'inert',reasons:['套件已安裝但未啟用']};
  const plugins=await manager.listPlugins();
  const rows=(bundle.rows??[]).map(row=>plugins.find(p=>p.entryId===row.entryId));
  if(rows.some(row=>row?.fiberPhase==='failed'))return {state:'broken',reasons:['宿主回報插件載入失敗；請查看內建外掛頁面']};
  if(rows.some(row=>!row||row.fiberPhase!=='active'))return {state:'pending',reasons:['已啟用，宿主列尚未全部進入 active 狀態']};
  return {state:'live',reasons:['宿主已確認啟用；視覺效果及個別功能仍需驗證']};
}
