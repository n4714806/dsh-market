import {createHash} from 'node:crypto';
export class CompatArtifactError extends Error {}
const hash=value=>createHash('sha256').update(value).digest('hex');
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
export function safePatchPath(path){
  return typeof path==='string'&&path.length<=240&&/^(?:src|lib)\/[A-Za-z0-9_./-]+\.(?:[cm]?js|jsx|ts|tsx|css)$/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..'||/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)||p==='__proto__'||p==='constructor'||p==='prototype');
}
// No paths below are used for filesystem operations. Source and changes remain JSON
// data; this function neither loads, evaluates, compiles nor deploys their contents.
export function buildCompatArtifact(record,source,draft){
  if(draft?.disposition!=='draft'||!Array.isArray(draft.patches)||!draft.patches.length||draft.patches.length>8)throw new CompatArtifactError('修補草稿格式不符合要求。');
  const changes=[],seen=new Set();
  for(const patch of draft.patches){
    if(!safePatchPath(patch.path)||seen.has(patch.path)||!own(source.files,patch.path))throw new CompatArtifactError('修補路徑不在已讀取的原始碼白名單，或有重複檔案。');
    const before=source.files[patch.path];
    if(typeof before!=='string'||typeof patch.oldText!=='string'||!patch.oldText.trim()||typeof patch.newText!=='string'||patch.oldText===patch.newText)throw new CompatArtifactError('修補內容沒有有效的實際變更。');
    if(Buffer.byteLength(patch.oldText)>12000||Buffer.byteLength(patch.newText)>12000)throw new CompatArtifactError('修補內容超出大小限制。');
    const first=before.indexOf(patch.oldText);
    if(first<0||before.indexOf(patch.oldText,first+1)!==-1)throw new CompatArtifactError('修補前文與鎖定原始碼不唯一吻合；未套用修補。');
    const after=before.slice(0,first)+patch.newText+before.slice(first+patch.oldText.length);
    seen.add(patch.path);changes.push({path:patch.path,beforeSha256:hash(before),afterSha256:hash(after),before,after,reason:patch.reason});
  }
  const artifact={format:'dsh-market-compat-draft-v1',installable:false,verified:false,application:'not-applied',packageName:record.packageName,sourceVersion:record.sourceVersion,runtimeVersion:record.runtimeVersion,runtimeSource:record.runtimeSource,sourceLock:record.sourceLock,archiveSha256:source.archiveSha256,omitted:source.omitted??[],ai:record.ai,report:draft,changes,checks:{structure:'passed',syntax:'not-run',runtime:'not-run',visual:'not-run'},limitations:['僅驗證修補前文與資料結構；未建置、執行或安裝。','不包含已驗證的完整可安裝套件；需要人工審查及安全隔離測試。','公開來源與 AI 產物仍是不受信任的程式碼。']};
  if(Buffer.byteLength(JSON.stringify(artifact))>256*1024)throw new CompatArtifactError('草稿產物超出儲存上限。');
  return artifact;
}
