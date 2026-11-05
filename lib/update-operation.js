import {lookupBundleVersion,compareSourceVersions} from './source-versions.js';
import {checkUpdatedVersion} from './update-version-check.js';
const success=r=>r&&!r.error&&['applied','restart-required'].includes(r.application)&&!r.pendingBuilds?.length;
function failure(r){
  const code=r?.packageResult?.output?.match(/ERR_PNPM_[A-Z_]+/)?.[0]??r?.error?.code??'operation-error';
  const age=/MINIMUM_RELEASE_AGE|TOO_NEW/.test(code);
  return {errorCode:code,error:age?'指定版本尚未符合套件管理器的發布時間政策；未降低或繞過安全政策，請稍後重試。':r?.pendingBuilds?.length?'需要明確批准建置腳本；請使用內建外掛管理。':r?.error?.diagnostic||r?.error?.code||`宿主操作未完成：${r?.application??'unknown'}`};
}
export async function executeVersionedUpdate(ctx,manager,bundle,args={},options={}) {
  const before=bundle.version;
  const source=bundle.source??'';
  const validName=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
  const registrySource=typeof source==='string'&&(source===bundle.name||(source.startsWith(bundle.name+'@')&&/^[0-9A-Za-z.*~^+|<>= -]+$/.test(source.slice(bundle.name.length+1))));
  if(!validName.test(bundle.name)||!registrySource||!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(before??''))return {ok:false,applied:false,needsManual:true,error:'此來源不是可精確還原的 registry 套件；未移除任何內容。請使用內建外掛管理更新。'};
  let registry,observed;
  try{
    const registries=await manager.registries();registry=registries.registry??registries.resolved;
    if(!registry)throw new Error('registry unavailable');
    observed=await (options.lookupVersion??lookupBundleVersion)(bundle,{force:true,registry,timeoutMs:8000});
  }catch{return {ok:false,applied:false,needsAttention:true,stage:'checking',error:'無法確認實際安裝 registry 的目標版本；未移除舊版，請重新檢測。'};}
  const target=observed?.npm?.version;
  if(observed?.primarySource!=='npm'||observed.npm.status!=='ok'||observed.npm.stale||compareSourceVersions(before,target)===null)return {ok:false,applied:false,stage:'checking',needsAttention:true,error:'來源版本無法確認；未移除舊版，請重新檢測。'};
  const envelope={targetVersion:target,previousVersion:before,registry};
  if(args.targetVersion!=null&&args.targetVersion!==target)return {...envelope,ok:false,applied:false,stage:'checking',needsAttention:true,error:'來源最新版本與畫面選定版本不同；未安裝其他版本，請重新檢測後再更新。'};
  if(compareSourceVersions(before,target)>=0)return {...envelope,ok:false,applied:false,noChange:true,stage:'checking',error:'目前版本不低於此安裝來源；沒有執行更新。',versionCheck:await checkUpdatedVersion(manager,bundle.name,before,target)};
  // An already-installed inspection is NOT a compatibility preflight. The native
  // installer remains authoritative for requirements, build approval and policies.
  const newSpec=`${bundle.name}@${target}`,oldSpec=`${bundle.name}@${before}`;
  const check=await manager.inspect(newSpec,{registry});
  if(check.status==='refused'&&check.problem!=='already-installed')return {...envelope,ok:false,applied:false,stage:'checking',error:check.reason};
  const removed=await manager.removeBundle(bundle.name);
  if(!success(removed))return {...envelope,ok:false,applied:false,stage:'removing',application:removed.application,...failure(removed),versionCheck:await checkUpdatedVersion(manager,bundle.name,before,target)};
  let result;
  try{result=await manager.installBundle(newSpec,{enabled:bundle.enabled,saveExact:true,registry});}
  catch(error){result={application:'failed',error:{diagnostic:error instanceof Error?error.message:String(error)}};}
  if(success(result)){
    const versionCheck=await checkUpdatedVersion(manager,bundle.name,before,target);
    const verified=versionCheck.status==='verified';
    return {...envelope,ok:verified,applied:verified,needsAttention:!verified,stage:'verifying',application:result.application,version:result.version,versionCheck,enabled:bundle.enabled,warnings:result.warnings??[],restartRequired:result.application==='restart-required',restartReason:result.restartReason??null,...(!verified?{error:versionCheck.reason}:{} )};
  }
  let rollback={attempted:true,ok:false};
  try{
    const present=(await manager.listBundles()).find(b=>b.name===bundle.name&&b.installed&&b.availability==='profile');
    if(present){const cleanup=await manager.removeBundle(bundle.name);if(!success(cleanup))throw new Error(failure(cleanup).error);}
    const restored=await manager.installBundle(oldSpec,{enabled:bundle.enabled,saveExact:true,registry});
    const restoreCheck=await checkUpdatedVersion(manager,bundle.name,before,before);
    rollback={attempted:true,ok:success(restored)&&restoreCheck.status==='verified',application:restored.application,version:restoreCheck.installed,...(!success(restored)?{error:failure(restored).error}:restoreCheck.status!=='verified'?{error:'宿主回報回復完成，但原版本尚未核實。'}:{})};
  }catch(error){rollback.error=error instanceof Error?error.message:String(error);}
  return {...envelope,ok:false,applied:false,stage:'installing',application:result.application,...failure(result),rollback,warnings:result.warnings??[],version:result.version,versionCheck:await checkUpdatedVersion(manager,bundle.name,before,target),restartRequired:rollback.application==='restart-required',restartReason:rollback.application==='restart-required'?'還原版本需要重啟才能載入':null};
}
