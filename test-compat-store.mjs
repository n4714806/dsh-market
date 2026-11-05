import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,symlinkSync,mkdirSync,unlinkSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {CompatStore} from './lib/compat-store.js';
const profile={name:'desktop',dir:'C:/isolated/test-profile'};
function setup(t){const dataDir=mkdtempSync(join(tmpdir(),'compat-store-'));t.after(()=>{assert.ok(resolve(dataDir).startsWith(resolve(tmpdir())));rmSync(dataDir,{recursive:true,force:true});});return {dataDir,store:new CompatStore({dataDir,profile})};}
const request=(requestId='request_1',meta={})=>({requestId,kind:'prepare',packageName:'owner/package',...meta});
test('opaque deterministic IDs, safe paths, metadata and clone isolation',t=>{
 const {store}=setup(t);const {record,created}=store.create(request('first',{runtimeVersion:'0.2.1-rc.5',runtimeSource:'host-release',application:'not-applied',requirements:{'engines.dsh':'>=0.2.0'}}));
 assert.equal(created,true);assert.match(record.id,/^[0-9a-f]{64}$/);assert.equal(record.running,true);assert.equal(record.packageName,'owner/package');assert.equal(store.file.includes('owner'),false);
 record.requirements['engines.dsh']='changed';assert.equal(store.get(record.id).requirements['engines.dsh'],'>=0.2.0');assert.equal(store.get('unknown'),null);
 const second=store.create(request('second')).record;assert.equal(store.list()[0].id,second.id);
});
test('duplicates retain identity; incompatible reuse rejects',t=>{
 const {store}=setup(t);const input=request('same',{parentId:'parent',sourceLock:{sha:'same'}});const first=store.create(input).record;
 assert.equal(store.create({...input,stage:'other'}).created,false);
 for(const change of [{kind:'generate'},{packageName:'other'},{parentId:'different'},{sourceLock:{sha:'changed'}}])assert.throws(()=>store.create({...input,...change}),/不同/);
 store.update(first.id,{status:'analyzed'});assert.equal(store.create(input).record.status,'analyzed');
});
test('restart interrupts running records and keeps terminal tasks without auto-retry',t=>{
 const {dataDir,store}=setup(t),one=store.create(request()).record,two=store.create(request('done')).record;store.update(two.id,{status:'official-option'});
 const restored=new CompatStore({dataDir,profile});assert.equal(restored.get(one.id).status,'interrupted');assert.equal(restored.get(one.id).running,false);assert.equal(restored.get(two.id).status,'official-option');assert.equal(restored.create(request()).created,false);
 assert.equal(new CompatStore({dataDir,profile:{...profile,dir:'C:/other-profile'}}).list().length,0);
});
test('terminal late update returns unchanged and late artifact save rejects',t=>{
 const {store}=setup(t),record=store.create(request()).record;const terminal=store.update(record.id,{status:'cancelled',stage:'cancelled',message:'已取消。'});
 assert.deepEqual(store.update(record.id,{status:'analyzed',message:'late'}),terminal);assert.throws(()=>store.saveArtifact(record.id,{x:1}),/已結束/);
});
test('JSON artifacts are hash-bound, immutable, and require an explicit journal reference',t=>{
 const {store}=setup(t),record=store.create(request()).record;const value={draft:{text:'unverified'},files:[]},ref=store.saveArtifact(record.id,value);
 assert.deepEqual(store.saveArtifact(record.id,value),ref);assert.throws(()=>store.readArtifact(record.id),/沒有/);store.update(record.id,{artifact:ref,status:'needs-review'});assert.deepEqual(store.readArtifact(record.id),value);
 assert.match(ref.sha256,/^[0-9a-f]{64}$/);assert.throws(()=>store.readArtifact('unknown'),/沒有/);assert.throws(()=>store.saveArtifact('../evil',{}),/找不到/);
});
test('running artifact cannot be overwritten with different content',t=>{
 const {store}=setup(t),record=store.create(request()).record;store.saveArtifact(record.id,{a:1});assert.throws(()=>store.saveArtifact(record.id,{a:2}),/覆寫/);
});
test('50 records are retained; overflow rejects without evicting idempotency',t=>{
 const {store}=setup(t);for(let i=0;i<50;i++)store.create(request(`r${i}`));assert.throws(()=>store.create(request('extra')),/50/);assert.equal(store.list().length,50);assert.equal(store.create(request('r0')).created,false);
});
test('journal/artifact size caps reject input without corrupting prior state',t=>{
 const {store}=setup(t),record=store.create(request()).record;
 assert.throws(()=>store.update(record.id,{report:{text:'x'.repeat(2*1024*1024)}}),/上限/);assert.equal(store.get(record.id).report,undefined);
 assert.throws(()=>store.saveArtifact(record.id,{text:'x'.repeat(256*1024)}),/上限/);assert.equal(store.get(record.id).running,true);
});
test('invalid request IDs, prototype fields, non-JSON and unexpected metadata reject',t=>{
 const {store}=setup(t);for(const id of ['','a/b','..','x\n','a'.repeat(129)])assert.throws(()=>store.create(request(id)),/無效/);
 for(const meta of [{secret:'bad'},{report:JSON.parse('{"nested":{"__proto__":{}}}')},{report:{x:NaN}},{report:{x:undefined}},{report:new Date()},{application:'applied'},{runtimeSource:'guessed'}])assert.throws(()=>store.create(request('bad',meta)),/無效/);
 const cyclic={};cyclic.self=cyclic;assert.throws(()=>store.create(request('cycle',{report:cyclic})),/無效/);assert.equal(store.list().length,0);
});
test('corrupt journal fails closed during reads and restart, never recreates empty history',t=>{
 const {dataDir,store}=setup(t);store.create(request());writeFileSync(store.file,'corrupt');assert.throws(()=>store.list(),/損壞/);assert.throws(()=>store.create(request('new')),/不可用/);assert.throws(()=>new CompatStore({dataDir,profile}),/損壞/);
});
test('artifact hash tampering poisons store instead of exposing altered output',t=>{
 const {store}=setup(t),record=store.create(request()).record,ref=store.saveArtifact(record.id,{text:'before'});store.update(record.id,{artifact:ref});
 writeFileSync(join(store.dir,`artifact-${record.id}.json`),'{"text":"after"}');assert.throws(()=>store.readArtifact(record.id),/損壞/);assert.throws(()=>store.list(),/不可用/);
});
test('unknown ID cannot write, update, or select a file path',t=>{
 const {store}=setup(t);assert.throws(()=>store.saveArtifact('a'.repeat(64),{}),/找不到/);assert.throws(()=>store.update('unknown',{status:'failed'}),/找不到/);assert.equal(store.list().length,0);
});
test('journal write failure fails closed',t=>{
 const {store}=setup(t);mkdirSync(store.file);assert.throws(()=>store.create(request()),/損壞/);assert.throws(()=>store.list(),/不可用/);
});
test('junction in compat-workbench directory is rejected without following it',t=>{
 const {dataDir,store}=setup(t);const outside=join(dataDir,'outside');mkdirSync(outside);
 const oldBase=store.base,held=join(dataDir,'held');assert.equal(oldBase,join(dataDir,'compat-workbench'));renameSync(oldBase,held);symlinkSync(outside,oldBase,'junction');
 assert.throws(()=>new CompatStore({dataDir,profile}),/損壞/);assert.throws(()=>store.list(),/損壞/);
});
test('journal junction rejects on restart and artifact junction rejects on read',t=>{
 const one=setup(t),r=one.store.create(request()).record,ref=one.store.saveArtifact(r.id,{text:'draft'});one.store.update(r.id,{artifact:ref});
 const artifact=join(one.store.dir,`artifact-${r.id}.json`),target=join(one.dataDir,'target');mkdirSync(target);
 assert.equal(artifact,join(one.store.dir,`artifact-${r.id}.json`));unlinkSync(artifact);symlinkSync(target,artifact,'junction');assert.throws(()=>one.store.readArtifact(r.id),/損壞/);
 const two=setup(t);two.store.create(request());assert.equal(two.store.file,join(two.store.dir,'journal.json'));unlinkSync(two.store.file);symlinkSync(target,two.store.file,'junction');assert.throws(()=>new CompatStore({dataDir:two.dataDir,profile}),/損壞/);
});
test('valid JSON journal altered outside this writer is rejected',t=>{
 const {store}=setup(t);store.create(request());const saved=JSON.parse(readFileSync(store.file,'utf8'));saved.records[0].record.message='changed';writeFileSync(store.file,JSON.stringify(saved));assert.throws(()=>store.list(),/損壞/);
});
test('artifact file symlink rejects before read when platform permits creation',t=>{
 const {dataDir,store}=setup(t),record=store.create(request()).record,ref=store.saveArtifact(record.id,{text:'original'});store.update(record.id,{artifact:ref});
 const artifact=join(store.dir,`artifact-${record.id}.json`),target=join(dataDir,'target.json');writeFileSync(target,readFileSync(artifact));
 assert.equal(artifact,join(store.dir,`artifact-${record.id}.json`));unlinkSync(artifact);
 try{symlinkSync(target,artifact,'file');}catch(error){if(['EPERM','EACCES'].includes(error.code)){t.skip('Windows file symlink privilege unavailable; junction test still executes');return;}throw error;}
 assert.throws(()=>store.readArtifact(record.id),/損壞/);
});
