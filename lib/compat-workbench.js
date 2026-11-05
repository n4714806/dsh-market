import semver from 'semver';
import {CompatStore} from './compat-store.js';
import {analyzeRegistryPackage,readRegistrySource,CompatSourceError} from './compat-source.js';
import {generateCompatDraft} from './compat-model.js';
import {buildCompatArtifact,safePatchPath,CompatArtifactError} from './compat-artifact.js';
import {requireTargetProfile} from './profile-runtime.js';
class CompatPreparationError extends Error {}
const PACKAGE=/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const checks=()=>({structure:'not-run',syntax:'not-run',runtime:'not-run',visual:'not-run'});
const sourceLock=a=>({version:a.sourceVersion,integrity:a.sourceIntegrity??a.manifest?.dist?.integrity??null});
const sameSource=(a,b)=>Boolean(a&&b&&a.version===b.version&&a.integrity===b.integrity);
export class CompatWorkbench {
 constructor(ctx,{dataDir,store,analyze=analyzeRegistryPackage,readSource=readRegistrySource,generate=generateCompatDraft}={}){
  this.ctx=ctx;this.store=store??new CompatStore({dataDir,profile:requireTargetProfile(ctx)});this.analyze=analyze;this.readSource=readSource;this.generate=generate;this.jobs=new Map();this.closed=false;
 }
 runtime(){const version=this.ctx.get('clientModules')?.graph?.().release?.version;if(!semver.valid(version))throw new CompatPreparationError('宿主未提供有效的 release 版本；無法準備修補。');return version;}
 record(id){const r=this.store.get(id);if(!r)throw new CompatPreparationError('找不到相容修補任務。');return r;}
 alive(id,signal){signal.throwIfAborted();if(this.closed||!this.record(id).running)throw new CompatPreparationError('任務已停止。');}
 start(input,run){
  if(this.closed)throw new CompatPreparationError('修補工作台已停止。');
  if(this.store.list().some(r=>r.requestId===input.requestId))return this.store.create(input).record;
  if(this.jobs.size>=2)throw new CompatPreparationError('已有兩項準備工作進行中，請稍後再試。');
  const created=this.store.create(input);if(!created.created)return created.record;
  const id=created.record.id,controller=new AbortController();this.jobs.set(id,controller);
  const done=Promise.resolve().then(()=>run(id,controller.signal)).catch(error=>{
   const safe=error instanceof CompatSourceError||error instanceof CompatArtifactError||error instanceof CompatPreparationError?error.message:null;
   try{const r=this.store.get(id);if(r?.running)this.store.update(id,{status:controller.signal.aborted?'cancelled':'failed',stage:r.stage==='validating-draft'?'artifact-rejected':'stopped',message:controller.signal.aborted?'已停止準備；沒有安裝或執行產物。':safe?`${safe} ${r.ai?'可能已計費；':''}未安裝或執行產物。`:r.stage==='validating-draft'?'模型已回應，但草稿路徑、前文或大小驗證未通過；可能已計費，未產生可安裝版本。':r.stage==='generating'?'模型結果未能安全保存，可能已計費；不會自動重試。':'來源或準備條件未通過要求；沒有安裝或執行產物。',application:'not-applied'});}catch{/* storage failures stay closed; never restart work */}
  }).finally(()=>this.jobs.delete(id));controller.done=done;
  return created.record;
 }
 async dispatch(action,args={}){
  requireTargetProfile(this.ctx,args.targetProfile);
  if(['prepare','generate'].includes(action)&&(typeof args.requestId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(args.requestId)))throw new CompatPreparationError('需要有效的冪等請求 ID。');
  if(action==='list')return this.store.list();
  if(action==='get')return this.store.get(args.id);
  if(action==='artifact')return this.store.readArtifact(args.id);
  if(action==='cancel'){
   const record=this.record(args.id),controller=this.jobs.get(args.id);
   if(!record.running)return {accepted:false,record};
   controller?.abort();return {accepted:true,record:this.store.update(args.id,{status:'cancelled',stage:'cancelled',message:'已請求停止；可能已有模型費用，未安裝任何產物。',application:'not-applied'})};
  }
  if(action==='prepare'){
   if(typeof args.packageName!=='string'||args.packageName.length>214||!PACKAGE.test(args.packageName))throw new CompatPreparationError('請輸入有效的公開 npm 套件名稱。');
   const runtimeVersion=this.runtime();
   return this.start({requestId:args.requestId,kind:'prepare',packageName:args.packageName,runtimeVersion,runtimeSource:'host-release',checks:checks(),stage:'analyzing',message:'正在查驗公開來源與版本宣告；不會呼叫 AI 或安裝。'},async(id,signal)=>{
    const a=await this.analyze(args.packageName,runtimeVersion,{signal});this.alive(id,signal);
    if(this.runtime()!==runtimeVersion)throw new CompatPreparationError('宿主版本已變動。');
    this.store.update(id,{sourceVersion:a.sourceVersion,sourceLock:sourceLock(a),requirements:a.requirements??[],officialOption:a.officialOption??null,status:a.officialOption?'official-option':'analyzed',stage:'diagnosed',message:a.officialOption?'找到宣告相容的官方版本；尚未安裝或驗證功能，不需先花 AI 費用修補。':'診斷完成；尚無已驗證相容版本。可另行選擇準備未驗證草稿。',application:'not-applied'});
   });
  }
  if(action==='generate'){
   const parent=this.record(args.id);
   if(!['analyzed','official-option'].includes(parent.status))throw new CompatPreparationError('請先完成來源診斷；此任務目前不能產生草稿。');
   if(parent.runtimeVersion!==this.runtime())throw new CompatPreparationError('DSH 版本已變動，請重新診斷。');
   const previous=this.store.list().find(r=>r.kind==='generate'&&r.parentId===parent.id);
   if(previous)return previous; // One generation attempt per diagnosis, even after a lost acknowledgement.
   return this.start({requestId:args.requestId,kind:'generate',parentId:parent.id,packageName:parent.packageName,runtimeVersion:parent.runtimeVersion,runtimeSource:'host-release',sourceVersion:parent.sourceVersion,sourceLock:parent.sourceLock,checks:checks(),stage:'reading-source',message:'正在驗證公開原碼；只準備 JSON 草稿，不執行、不安裝。'},async(id,signal)=>{
    const a=await this.analyze(parent.packageName,parent.runtimeVersion,{signal});this.alive(id,signal);
    if(!sameSource(sourceLock(a),parent.sourceLock))throw new CompatPreparationError('上游來源已改變，請重新診斷。');
    const source=await this.readSource(a,{signal});this.alive(id,signal);
    const files={};let bytes=0;const omitted=[...(Array.isArray(source.omitted)?source.omitted:[])];
    for(const [path,text] of Object.entries(source.files??{})){
     if(!safePatchPath(path))continue;
     const size=Buffer.byteLength(JSON.stringify({[path]:text}));
     if(bytes+size>70000){omitted.push(path);continue;}files[path]=text;bytes+=size;
    }
    if(!Object.keys(files).length){this.store.update(id,{status:'unsupported',stage:'source-unavailable',message:'沒有可在限制內完整讀取的可修補原碼；未呼叫 AI，也未安裝。',application:'not-applied'});return;}
    const evidence={packageName:parent.packageName,sourceVersion:parent.sourceVersion,runtimeVersion:parent.runtimeVersion,runtimeSource:'host-release',sourceLock:parent.sourceLock,archiveSha256:source.archiveSha256,requirements:a.requirements??[],files,omitted,apiContractEvidence:[],limitations:['沒有完整目標版本 API 契約；不能捏造不存在的 API。','不會執行第三方建置或測試。只能提出可供人工審查的草稿。']};
    const selection=this.ctx.get('agentDefaultModel')?.currentSelection?.();
    this.store.update(id,{ai:{provider:selection?.provider??null,model:selection?.model??null,status:'requested'},stage:'generating',message:'使用當下全域預設模型準備草稿；一次請求、無工具、不執行產物。'});
    const result=await this.generate(this.ctx,{evidence,signal,timeoutMs:90000,maxTokens:4096});this.alive(id,signal);
    this.store.update(id,{ai:result.ai,stage:'validating-draft',message:'模型已回應；正在驗證草稿資料，可能已產生模型費用。'});
    if(this.runtime()!==parent.runtimeVersion)throw new CompatPreparationError('DSH 版本已變動。');
    if(!result.ok){this.store.update(id,{status:'failed',stage:'model-failed',ai:result.ai,message:result.ai?.reason??'模型未產生符合要求的草稿；未安裝。',application:'not-applied'});return;}
    if(result.draft.disposition==='unsupported'){this.store.update(id,{status:'unsupported',stage:'unsupported',ai:result.ai,report:result.draft,message:'AI 未提出可核對的修補方案；沒有產生可安裝版本。',application:'not-applied'});return;}
    const current={...this.record(id),ai:result.ai};
    const artifact=buildCompatArtifact(current,{...source,files,omitted},result.draft);this.alive(id,signal);
    const receipt=this.store.saveArtifact(id,artifact);
    this.store.update(id,{status:'needs-review',stage:'draft-prepared',ai:result.ai,report:result.draft,artifact:receipt,checks:artifact.checks,message:'未驗證草稿已保存；僅結構及修補前文核對通過，不能直接安裝。',application:'not-applied'});
   });
  }
  if(action==='check-upstream'){
   const record=this.record(args.id),runtimeVersion=this.runtime();
   const a=await this.analyze(record.packageName,runtimeVersion,{});
   return {packageName:record.packageName,previousVersion:record.sourceVersion,sourceVersion:a.sourceVersion,runtimeVersion,changed:!sameSource(sourceLock(a),record.sourceLock),officialOption:a.officialOption??null,checkedAt:new Date().toISOString(),message:'僅查詢上游；沒有重新生成、安裝或套用 patch。'};
  }
  throw new CompatPreparationError('不支援的相容修補操作；此工作台沒有安裝或版本豁免功能。');
 }
 dispose(){this.closed=true;for(const [id,controller] of this.jobs){controller.abort();try{if(this.store.get(id)?.running)this.store.update(id,{status:'interrupted',stage:'interrupted',message:'宿主或工作台已停止；不會自動恢復生成或安裝。',application:'not-applied'});}catch{}}}
}
