import {constants,mkdirSync,lstatSync,realpathSync,readFileSync,writeFileSync,renameSync,unlinkSync,openSync,closeSync,fsyncSync,fstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const LIMIT = 2*1024*1024, ARTIFACT_LIMIT = 256*1024;
const STATES = new Set(['running','analyzed','official-option','needs-review','unsupported','failed','cancelled','interrupted']);
const META = new Set(['parentId','runtimeVersion','sourceVersion','officialOption','ai','report','checks','artifact','sourceLock','stage','message','requirements','runtimeSource','application','error']);
const BAD_KEYS = new Set(['__proto__','prototype','constructor']);
const hash = text => createHash('sha256').update(text).digest('hex');
const hex = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const clone = value => JSON.parse(JSON.stringify(value));
function invalid() { throw new Error('修補記錄輸入無效或超出安全上限。'); }
function clean(value, depth=0, seen=new Set()) {
  if (depth>32) invalid();
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') { if (!Number.isFinite(value)) invalid(); return value; }
  if (!value || typeof value !== 'object' || seen.has(value)) invalid();
  seen.add(value);
  let out;
  if (Array.isArray(value)) {
    out=[];
    for(let i=0;i<value.length;i++) { const d=Object.getOwnPropertyDescriptor(value,String(i));if(!d || !('value' in d))invalid();out.push(clean(d.value,depth+1,seen)); }
  } else {
    if (![Object.prototype,null].includes(Object.getPrototypeOf(value))) invalid();
    out={};
    for(const key of Object.keys(value).sort()) {
      const d=Object.getOwnPropertyDescriptor(value,key);
      if(BAD_KEYS.has(key)||!d||!('value' in d))invalid();
      out[key]=clean(d.value,depth+1,seen);
    }
  }
  seen.delete(value);return out;
}
function serialized(value,limit) { const text=JSON.stringify(clean(value));if(Buffer.byteLength(text,'utf8')>limit)invalid();return text; }
function metadata(input) {
  const result={};
  for(const [key,value] of Object.entries(input)) {
    if(!META.has(key))invalid();
    if(value!==undefined)result[key]=clean(value);
  }
  if(result.application!==undefined&&result.application!=='not-applied')invalid();
  if(result.runtimeSource!==undefined&&result.runtimeSource!=='host-release')invalid();
  for(const key of ['stage','message','error']) if(result[key]!==undefined && (typeof result[key]!=='string'||result[key].length>1000||/[\x00-\x1f\x7f]/.test(result[key])))invalid();
  return result;
}
export class CompatStore {
  constructor({dataDir,profile}) {
    if(typeof dataDir!=='string'||!profile||typeof profile.name!=='string'||!profile.name||typeof profile.dir!=='string'||!profile.dir)invalid();
    this.profile=profile.name;
    this.profileKey=hash(JSON.stringify([profile.name,resolve(profile.dir)]));
    this.records=new Map(); this.identities=new Map(); this.poisoned=false;
    this.root=this.io(()=>{mkdirSync(dataDir,{recursive:true});return realpathSync(dataDir);});
    this.base=join(this.root,'compat-workbench');this.dir=join(this.base,this.profileKey);this.file=join(this.dir,'journal.json');
    this.io(()=>{this.ensureDir(this.base);this.ensureDir(this.dir);});
    const text=this.io(()=>this.readFile(this.file,LIMIT,true));
    this.journalDigest=text===null?null:hash(text);
    if(text!==null)this.io(()=>{
      const saved=JSON.parse(text);
      if(!saved||saved.version!==1||saved.profileKey!==this.profileKey||!Array.isArray(saved.records)||saved.records.length>50)throw new Error();
      serialized(saved,LIMIT);
      for(const entry of saved.records) {
        const record=entry.record;
        if(!record||!hex(record.id)||record.id!==hash(`${this.profileKey}:${record.requestId}`)||!this.validRequest(record.requestId)||!['prepare','generate'].includes(record.kind)||!STATES.has(record.status)||record.running!==(record.status==='running')||record.profile!==this.profile||!hex(entry.identity)||this.records.has(record.id)||typeof record.packageName!=='string'||!record.packageName||!Number.isFinite(Date.parse(record.createdAt))||!Number.isFinite(Date.parse(record.updatedAt)))throw new Error();
        if(Object.keys(entry).some(key=>!['record','identity'].includes(key)))throw new Error();
        const {id,requestId,kind,packageName,profile:storedProfile,status,running,createdAt,updatedAt,...rest}=record;
        metadata(rest);
        if(typeof record.stage!=='string'||typeof record.message!=='string'||new Date(createdAt).toISOString()!==createdAt||new Date(updatedAt).toISOString()!==updatedAt)throw new Error();
        if(record.artifact!==undefined&&(!record.artifact||Object.keys(record.artifact).length!==2||record.artifact.id!==id||!hex(record.artifact.sha256)))throw new Error();
        this.records.set(record.id,record);this.identities.set(record.id,entry.identity);
      }
      let changed=false;
      for(const record of this.records.values())if(record.running){Object.assign(record,{status:'interrupted',running:false,stage:'interrupted',message:'宿主已重新啟動；不會自動重試。',updatedAt:new Date().toISOString()});changed=true;}
      if(changed)this.commit(this.records,this.identities);
    });
  }
  validRequest(value) { return typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value); }
  available() { if(this.poisoned)throw new Error('修補儲存不可用；已停止操作，請檢查儲存後重新啟動。'); }
  io(operation) { this.available();try{return operation();}catch{this.poisoned=true;throw new Error('修補儲存損壞或無法安全存取；已停止操作。');} }
  ensureDir(path) {
    let stat;try{stat=lstatSync(path);}catch(error){if(error.code!=='ENOENT')throw error;mkdirSync(path);stat=lstatSync(path);}
    if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync(path)!==path)throw new Error();
  }
  checkDirs() { for(const path of [this.base,this.dir]){const stat=lstatSync(path);if(stat.isSymbolicLink()||!stat.isDirectory()||realpathSync(path)!==path)throw new Error();} }
  checkFile(path,missing=false) {
    this.checkDirs();let stat;
    try{stat=lstatSync(path);}catch(error){if(missing&&error.code==='ENOENT')return null;throw error;}
    if(stat.isSymbolicLink()||!stat.isFile()||stat.nlink>1)throw new Error();return stat;
  }
  readFile(path,limit,missing=false) {
    const stat=this.checkFile(path,missing);if(stat===null)return null;if(stat.size>limit)throw new Error();
    const fd=openSync(path,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
    try {const opened=fstatSync(fd);if(!opened.isFile()||opened.ino!==stat.ino||opened.dev!==stat.dev||opened.size>limit)throw new Error();const raw=readFileSync(fd);if(raw.byteLength>limit)throw new Error();const text=new TextDecoder('utf-8',{fatal:true}).decode(raw);this.checkFile(path);return text;}finally{closeSync(fd);}
  }
  atomic(path,text) {
    this.checkFile(path,true);
    const temporary=join(this.dir,`.tmp-${randomUUID()}.json`);
    try {
      writeFileSync(temporary,text,{encoding:'utf8',flag:'wx',mode:0o600});
      this.checkFile(temporary);
      const fd=openSync(temporary,constants.O_RDWR|(constants.O_NOFOLLOW??0));try{fsyncSync(fd);}finally{closeSync(fd);}
      this.checkFile(path,true);renameSync(temporary,path);this.checkFile(path);
    } catch(error) {
      // Never follow a replaced directory for cleanup.
      try{this.checkDirs();const stat=lstatSync(temporary);if(stat.isFile()&&!stat.isSymbolicLink())unlinkSync(temporary);}catch{}
      throw error;
    }
  }
  commit(records,identities) {
    const text=serialized({version:1,profileKey:this.profileKey,records:[...records.values()].map(record=>({record,identity:identities.get(record.id)}))},LIMIT);
    this.io(()=>this.atomic(this.file,text));this.journalDigest=hash(text);this.records=records;this.identities=identities;
  }
  checkJournal() {
    this.available();this.io(()=>{const text=this.readFile(this.file,LIMIT,this.journalDigest===null);if((text===null?null:hash(text))!==this.journalDigest)throw new Error();if(text!==null){const saved=JSON.parse(text);serialized(saved,LIMIT);if(saved.profileKey!==this.profileKey||saved.version!==1)throw new Error();}});
  }
  get(id) {this.checkJournal();return this.records.has(id)?clone(this.records.get(id)):null;}
  list() {this.checkJournal();return clone([...this.records.values()].reverse());}
  create(input) {
    this.checkJournal();const {requestId,kind,packageName,...rest}=input??{};
    if(!this.validRequest(requestId)||!['prepare','generate'].includes(kind)||typeof packageName!=='string'||!packageName.trim()||packageName.length>214||/[\x00-\x1f\x7f]/.test(packageName))invalid();
    const meta=metadata(rest);if(meta.artifact!==undefined)invalid();
    const id=hash(`${this.profileKey}:${requestId}`);
    const {stage:_stage,message:_message,...identityMeta}=meta;
    const identity=hash(serialized({kind,packageName,...identityMeta},LIMIT));
    if(this.records.has(id)) {if(this.identities.get(id)!==identity)throw new Error('requestId 已用於不同的修補要求。');return {created:false,record:clone(this.records.get(id))};}
    if(this.records.size>=50)throw new Error('修補歷史已達 50 筆上限；未執行新的要求。');
    const now=new Date().toISOString();
    const record={...meta,id,requestId,kind,packageName,profile:this.profile,status:'running',running:true,stage:meta.stage??'queued',message:meta.message??'要求已記錄，尚未安裝或執行任何產物。',createdAt:now,updatedAt:now};
    const records=new Map(this.records),identities=new Map(this.identities);records.set(id,record);identities.set(id,identity);this.commit(records,identities);
    return {created:true,record:clone(record)};
  }
  update(id,patch) {
    this.checkJournal();const previous=this.records.get(id);if(!previous)throw new Error('找不到修補要求。');
    if(!previous.running)return clone(previous);
    const {status,...rest}=patch??{};if(status!==undefined&&!STATES.has(status))invalid();
    const meta=metadata(rest);if(meta.parentId!==undefined&&meta.parentId!==previous.parentId)invalid();
    if(meta.artifact!==undefined)this.verifyArtifact(id,meta.artifact);
    const record={...previous,...meta,status:status??previous.status,updatedAt:new Date().toISOString()};record.running=record.status==='running';
    const records=new Map(this.records);records.set(id,record);this.commit(records,this.identities);return clone(record);
  }
  artifactPath(id) {if(!hex(id))invalid();return join(this.dir,`artifact-${id}.json`);}
  saveArtifact(id,value) {
    this.checkJournal();const record=this.records.get(id);if(!record)throw new Error('找不到修補要求。');if(!record.running)throw new Error('修補要求已結束；拒絕較晚的產物。');
    const text=serialized(value,ARTIFACT_LIMIT),sha256=hash(text),path=this.artifactPath(id);
    const existing=this.io(()=>this.readFile(path,ARTIFACT_LIMIT,true));
    if(existing!==null&&existing!==text)throw new Error('草稿產物已保存且不可覆寫。');
    if(existing===null)this.io(()=>this.atomic(path,text));
    return {id,sha256};
  }
  verifyArtifact(id,ref) {
    if(!ref||Object.keys(ref).length!==2||ref.id!==id||!hex(ref.sha256))invalid();
    return this.io(()=>{const text=this.readFile(this.artifactPath(id),ARTIFACT_LIMIT);if(hash(text)!==ref.sha256)throw new Error();const value=JSON.parse(text);serialized(value,ARTIFACT_LIMIT);return value;});
  }
  readArtifact(id) {
    this.checkJournal();const record=this.records.get(id);if(!record||!record.artifact)throw new Error('沒有已登記的草稿產物。');return this.verifyArtifact(id,record.artifact);
  }
}
