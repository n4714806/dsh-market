// Public npm data only. Never installs, imports package code, extracts to disk,
// executes scripts, reads credentials, or treats compatibility as runtime verification.
import semver from 'semver';
import {createHash, timingSafeEqual} from 'node:crypto';
import {gunzipSync} from 'node:zlib';

const REGISTRY = 'https://registry.npmjs.org';
const METADATA_CAP = 12 * 1024 * 1024;
const ARCHIVE_CAP = 8 * 1024 * 1024;
const INFLATED_CAP = 32 * 1024 * 1024;
const FILE_CAP = 2 * 1024 * 1024;
const TEXT_CAP = 96_000;
const NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export class CompatSourceError extends Error { constructor(code) { super(`公開 npm 來源讀取已停止：${code}`); this.code=code; } }
function fail(code) { throw new CompatSourceError(code); }
function packageName(value) {
  if (typeof value !== 'string' || value.length > 214 || !NAME.test(value)) fail('invalid-package-name');
  return value;
}
function publicURL(value) {
  if (typeof value !== 'string' || value.length > 2048) fail('invalid-source-url');
  let url;
  try { url = new URL(value); } catch { fail('invalid-source-url'); }
  if (url.origin !== REGISTRY || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /[\\\s]/.test(value)) fail('invalid-source-url');
  return url.href;
}
function integrity(value) {
  // Deliberately accept exactly one complete supported SRI digest, no options,
  // weak hashes, partial digests or ambiguous multiple tokens.
  if (typeof value !== 'string') fail('missing-integrity');
  const match = value.match(/^(sha512|sha256)-([A-Za-z0-9+/]+={0,2})$/);
  if (!match) fail('invalid-integrity');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length !== (match[1] === 'sha512' ? 64 : 32) || bytes.toString('base64') !== match[2]) fail('invalid-integrity');
  return {algorithm:match[1],bytes,value};
}
async function fetchBytes(url, cap, {fetchImpl=globalThis.fetch,signal,timeoutMs=20_000}={}) {
  publicURL(url);
  if (typeof fetchImpl !== 'function') fail('fetch-unavailable');
  if (signal?.aborted) fail('aborted');
  const controller = new AbortController();
  let timer, reader, timedOut=false;
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort',onAbort,{once:true});
  let onControllerAbort;
  const stopped = new Promise((_,reject) => {
    onControllerAbort=()=>{ const e=new Error('request-ended'); e.code=timedOut?'timeout':'aborted'; reject(e); };
    controller.signal.addEventListener('abort',onControllerAbort,{once:true});
    timer=setTimeout(()=>{timedOut=true;controller.abort();},Number.isFinite(timeoutMs)?Math.max(1,Math.min(20_000,timeoutMs)):20_000);
  });
  try {
    return await Promise.race([stopped,(async()=>{
      const res=await fetchImpl(url,{signal:controller.signal,redirect:'error',credentials:'omit',cache:'no-store',headers:{Accept:'application/json, application/octet-stream','User-Agent':'dsh-market-compat-source'}});
      if(controller.signal.aborted) fail(timedOut?'timeout':'aborted');
      // Also reject nonconforming adapters which followed redirects anyway.
      if(res.redirected || (res.url && res.url!==url)) fail('redirect-rejected');
      if(!res.ok) fail(res.status>=300&&res.status<400?'redirect-rejected':res.status===429?'rate-limited':`http-${Number.isInteger(res.status)?res.status:'error'}`);
      const length=res.headers?.get?.('content-length');
      if(length && /^\d+$/.test(length) && Number(length)>cap) fail('response-too-large');
      if(!res.body?.getReader) fail('unbounded-response-adapter');
      reader=res.body.getReader();
      const chunks=[]; let total=0;
      while(true){
        if(controller.signal.aborted) fail(timedOut?'timeout':'aborted');
        const {done,value}=await reader.read();
        if(done) break;
        if(!(value instanceof Uint8Array)) fail('invalid-response-body');
        total+=value.byteLength;
        if(total>cap) fail('response-too-large');
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks,total);
    })()]);
  } catch(error) {
    const allowed=new Set(['timeout','aborted','redirect-rejected','rate-limited','response-too-large','unbounded-response-adapter','invalid-response-body']);
    fail(allowed.has(error?.code)||/^http-(?:\d{3}|error)$/.test(error?.code??'')?error.code:controller.signal.aborted?(timedOut?'timeout':'aborted'):'network-or-response-error');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort',onAbort);
    controller.signal.removeEventListener('abort',onControllerAbort);
    controller.abort();
    try { Promise.resolve(reader?.cancel()).catch(()=>{}); } catch { /* ignored */ }
  }
}
function decode(bytes, code='invalid-utf8') { try { return new TextDecoder('utf-8',{fatal:true}).decode(bytes); } catch { fail(code); } }
function parseJSON(bytes) { try { return JSON.parse(decode(bytes)); } catch { fail('invalid-json'); } }
function checkedManifest(value,name,version) {
  if(!record(value)||value.name!==name||value.version!==version||!semver.valid(version)) fail('manifest-identity-mismatch');
  return value;
}
function hostRequirements(manifest,runtimeVersion) {
  let entries;
  const invalid={requirements:[],declaredCompatible:false,compatibility:'invalid'};
  if(own(manifest,'engines')&&!record(manifest.engines)) return invalid;
  const engine=record(manifest.engines)&&own(manifest.engines,'dsh');
  if(engine) entries=[['engines.dsh',manifest.engines.dsh]];
  else {
    if(own(manifest,'peerDependencies')&&!record(manifest.peerDependencies)) return invalid;
    const all=Object.entries(manifest.peerDependencies??{});
    if(all.some(([,value])=>typeof value!=='string')) return invalid;
    entries=all.filter(([name])=>name==='@deepseek-ai/dsh'||name.startsWith('@deepseek-ai/dsh-'));
  }
  if(!entries.length) return {requirements:[],declaredCompatible:false,compatibility:'unknown'};
  if(entries.length>64) return {requirements:[],declaredCompatible:false,compatibility:'invalid'};
  let valid=true, compatible=true;
  const requirements=entries.map(([name,range])=>{
    let resolved=range;
    if(typeof range!=='string'||!range.trim()||range.length>256) valid=false;
    else {
      if(!engine&&range.startsWith('workspace:')) {
        const rest=range.slice(10);
        resolved=['*','^','~'].includes(rest)?runtimeVersion:null;
      }
      if(!semver.validRange(resolved,{includePrerelease:true})) valid=false;
      else if(!semver.satisfies(runtimeVersion,resolved,{includePrerelease:true})) compatible=false;
    }
    return {name:name.slice(0,214),range:typeof range==='string'?range.slice(0,256):null};
  });
  return {requirements,declaredCompatible:valid&&compatible,compatibility:valid?(compatible?'declared-compatible':'incompatible'):'invalid'};
}

/** sourceURL is the locked tarball URL; registryURL identifies the metadata request.
 * officialOption is a publisher declaration, never a runtime-tested guarantee.
 * No AI/source download occurs here. Unknown/invalid ranges do not become compatible.
 */
export async function analyzeRegistryPackage(name,runtimeVersion,options={}) {
  packageName(name);
  if(typeof runtimeVersion!=='string'||!semver.valid(runtimeVersion)) fail('invalid-runtime-version');
  const registryURL=`${REGISTRY}/${encodeURIComponent(name)}`;
  const data=parseJSON(await fetchBytes(registryURL,METADATA_CAP,options));
  if(!record(data)||data.name!==name||!record(data.versions)) fail('metadata-identity-mismatch');
  const latest=data['dist-tags']?.latest;
  if(typeof latest!=='string'||!semver.valid(latest)||!own(data.versions,latest)) fail('invalid-latest-version');
  const manifest=checkedManifest(data.versions[latest],name,latest);
  const requirements=hostRequirements(manifest,runtimeVersion);
  const sourceURL=publicURL(manifest.dist?.tarball);
  const sourceIntegrity=integrity(manifest.dist?.integrity).value;
  let officialOption=null,scannedVersions=0;
  const isDeprecated=m=>own(m,'deprecated')&&m.deprecated!==false&&m.deprecated!==''&&m.deprecated!=null;
  if(requirements.declaredCompatible&&!isDeprecated(manifest)) officialOption={version:latest,reason:'發布者宣告與目前宿主版本相容；尚未實際載入驗證。'};
  else {
    const candidates=Object.keys(data.versions).filter(v=>semver.valid(v)&&semver.lt(v,latest)).sort(semver.rcompare).slice(0,250);
    for(const version of candidates){
      if(options.signal?.aborted) fail('aborted');
      scannedVersions++;
      const candidate=checkedManifest(data.versions[version],name,version);
      if(isDeprecated(candidate)) continue;
      const result=hostRequirements(candidate,runtimeVersion);
      if(result.declaredCompatible){officialOption={version,reason:'發布者提供較舊且宣告相容的版本；請先確認，尚未實際載入驗證。'};break;}
    }
  }
  if(officialOption) officialOption.metadataURL=`${registryURL}/${encodeURIComponent(officialOption.version)}`;
  return {packageName:name,runtimeVersion,sourceVersion:latest,sourceURL,sourceIntegrity,registryURL,manifest,officialOption,...requirements,scannedVersions,scanLimit:250,runtimeVerified:false};
}

function tarString(bytes) {
  const zero=bytes.indexOf(0);
  if(zero>=0 && bytes.subarray(zero).some(n=>n!==0)) fail('invalid-tar-string');
  return decode(zero<0?bytes:bytes.subarray(0,zero),'invalid-tar-string');
}
function octal(bytes) {
  if(bytes.some(n=>n>127)) fail('invalid-tar-number');
  const raw=bytes.toString('ascii');
  if(!/^[ \0]*[0-7]+[ \0]*$/.test(raw)) fail('invalid-tar-number');
  const value=raw.replace(/\0/g,' ').trim();
  const n=Number.parseInt(value,8);
  if(!Number.isSafeInteger(n)||n<0) fail('invalid-tar-number');
  return n;
}
function tarPath(name,isDirectory) {
  if(!name||name.length>512||name.startsWith('/')||/[\\:<>"|?*\x00-\x1f\x7f]/.test(name)) fail('unsafe-tar-path');
  const path=isDirectory?name.replace(/\/$/,''):name;
  const parts=path.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'||/[ .]$/.test(p)||/^(?:con|prn|aux|nul|conin\$|conout\$|clock\$|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(p))) fail('unsafe-tar-path');
  if(parts[0]!=='package'||(!isDirectory&&parts.length<2)) fail('unexpected-tar-root');
  return parts.slice(1).join('/');
}
function parseTar(bytes) {
  const files=[]; const names=new Map(); let at=0, ended=false,count=0,entries=0;
  while(at+512<=bytes.length){
    const header=bytes.subarray(at,at+512);
    if(header.every(n=>n===0)){
      if(at+1024>bytes.length||bytes.subarray(at+512).some(n=>n!==0)) fail('invalid-tar-ending');
      ended=true;break;
    }
    if(++entries>2000)fail('too-many-tar-entries');
    const expected=octal(header.subarray(148,156));
    let checksum=0;
    for(let i=0;i<512;i++)checksum+=i>=148&&i<156?32:header[i];
    if(checksum!==expected)fail('tar-checksum-mismatch');
    const type=header[156];
    if(![0,48,53].includes(type))fail('unsupported-tar-entry');
    const directory=type===53;
    const size=octal(header.subarray(124,136));
    if(size>FILE_CAP)fail('tar-file-too-large');
    if(directory&&size!==0)fail('invalid-tar-directory');
    const magic=header.subarray(257,263).toString('ascii');
    if(!['ustar\0','\0\0\0\0\0\0'].includes(magic))fail('unsupported-tar-format');
    const prefix=magic==='ustar\0'?tarString(header.subarray(345,500)):'';
    const rawName=tarString(header.subarray(0,100));
    const path=tarPath(prefix?`${prefix}/${rawName}`:rawName,directory);
    if(tarString(header.subarray(157,257))) fail('unsupported-tar-link');
    const key=path.normalize('NFC').toLowerCase();
    if(names.has(key))fail('tar-path-collision');
    // A file cannot be the ancestor of another entry (even without a directory header).
    const parts=key.split('/');
    for(let i=1;i<parts.length;i++)if(names.get(parts.slice(0,i).join('/'))===false)fail('tar-path-collision');
    if(!directory&&[...names.keys()].some(k=>k.startsWith(key+'/')))fail('tar-path-collision');
    names.set(key,directory);
    at+=512;
    if(at+size>bytes.length)fail('truncated-tar');
    if(!directory){if(++count>1000)fail('too-many-tar-files');files.push({path,bytes:bytes.subarray(at,at+size)});}
    at+=Math.ceil(size/512)*512;
  }
  if(!ended)fail('invalid-tar-ending');
  return files;
}
function priority(path) {
  if(path==='package.json')return 0;
  if(/^(?:readme|licen[sc]e|copying)(?:\.[a-z0-9]+)?$/i.test(path))return 1;
  if(/^(?:lib|src)\/.+\.(?:[cm]?[jt]sx?|json|css|ya?ml)$/i.test(path))return /(?:^|\/)(?:index|client|config)\.[cm]?[jt]sx?$/.test(path)?2:3;
  return 9;
}

/** Whole UTF-8 files only: never returns a truncated preimage. Omitted paths have
 * explicit reasons; source completeness must not be assumed for an AI patch.
 */
export async function readRegistrySource(analysis,options={}) {
  if(!record(analysis))fail('invalid-analysis');
  const name=packageName(analysis.packageName);
  const manifest=checkedManifest(analysis.manifest,name,analysis.sourceVersion);
  const url=publicURL(manifest.dist?.tarball);
  const sri=integrity(manifest.dist?.integrity);
  if(analysis.sourceURL!==url||analysis.sourceIntegrity!==sri.value)fail('analysis-source-mismatch');
  const compressed=await fetchBytes(url,ARCHIVE_CAP,options);
  const actual=createHash(sri.algorithm).update(compressed).digest();
  if(!timingSafeEqual(actual,sri.bytes))fail('integrity-mismatch');
  let expanded;
  try { expanded=gunzipSync(compressed,{maxOutputLength:INFLATED_CAP}); } catch { fail('invalid-or-oversized-gzip'); }
  if(options.signal?.aborted)fail('aborted');
  const entries=parseTar(expanded);
  const pkg=entries.find(e=>e.path==='package.json');
  if(!pkg)fail('archive-manifest-missing');
  checkedManifest(parseJSON(pkg.bytes),name,analysis.sourceVersion);
  const files={},omitted=[];let totalBytes=0;
  for(const entry of entries.sort((a,b)=>priority(a.path)-priority(b.path)||a.path.localeCompare(b.path))){
    let reason=null,text;
    if(priority(entry.path)===9)reason='not-selected';
    else if(Object.keys(files).length>=12)reason='file-count-limit';
    else if(totalBytes+entry.bytes.length>TEXT_CAP)reason='text-byte-limit';
    else {
      try { text=new TextDecoder('utf-8',{fatal:true}).decode(entry.bytes); if(text.includes('\0'))reason='binary'; }
      catch { reason='non-utf8'; }
    }
    if(reason)omitted.push({path:entry.path,bytes:entry.bytes.length,reason});
    else {Object.defineProperty(files,entry.path,{value:text,enumerable:true,writable:true,configurable:true});totalBytes+=entry.bytes.length;}
  }
  return {files,archiveSha256:createHash('sha256').update(compressed).digest('hex'),integrity:sri.value,omitted,totalBytes,totalFiles:entries.length,complete:omitted.length===0,filesAreComplete:true,sourceURL:url,sourceVersion:analysis.sourceVersion};
}
