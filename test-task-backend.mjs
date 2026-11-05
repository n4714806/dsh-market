import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {InstallTaskStore,taskReply} from './lib/install-task-store.js';
import {AttentionError,startTrackedSubagent,awaitTrackedResult,listParents} from './lib/subagent-tracked.js';
const profile={name:'test',dir:'C:/isolated-profile'};
function temporary(t) { const dir=mkdtempSync(join(tmpdir(),'market-task-test-')); t.after(()=>{assert.ok(resolve(dir).startsWith(resolve(tmpdir())));rmSync(dir,{recursive:true,force:true});});return dir; }
function deferred() { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject}; }
function context(run,query) { const parent={id:'parent'}; let starts=0,disposed=0,interrupts=0; const activation=run ?? {childId:'child',result:Promise.resolve({stopReason:'completed',output:[]}),dispose:async()=>{disposed++;}};const services={agents:{roots:()=>[parent],get:id=>id==='parent'?parent:undefined},subagents:{list:()=>['spawn'],startActivation:async spec=>{starts++;assert.equal(spec.request.parent,parent);assert.equal(spec.delivery,'caller');return activation;},interrupt:()=>{interrupts++;}},sessionQuery:{readSession:query ?? (async id=>({session:{id}}))}};return {get:k=>services[k],services,counts:()=>({starts,disposed,interrupts})}; }
const opts=()=>({parentSessionId:'parent',prompt:'read only',label:'test',signal:new AbortController().signal,timeoutMs:100});
test('store persists bounded records/events; isolates profile; restart interrupts without retry',t=>{
 const dataDir=temporary(t),store=new InstallTaskStore({dataDir,profile});
 store.create({id:'one',pluginId:'p',kind:'ai:install'});
 for(let i=0;i<70;i++)store.update('one',{stage:'checking',message:`safe ${i}`});
 assert.equal(store.get('one').events.length,50);
 const restored=new InstallTaskStore({dataDir,profile});assert.equal(restored.get('one').status,'interrupted');assert.equal(restored.get('one').running,false);
 assert.equal(restored.create({id:'one'}).created,false);
 assert.equal(new InstallTaskStore({dataDir,profile:{...profile,dir:'other'}}).list().length,0);
 for(let i=0;i<105;i++){restored.create({id:`task-${i}`,kind:'install'});restored.update(`task-${i}`,{status:'succeeded'});}
 assert.equal(restored.list().length,100);assert.throws(()=>restored.create({id:'one'}),/已使用/);
 assert.equal(JSON.parse(readFileSync(store.file,'utf8')).tasks.length,100);
});
test('terminal snapshots do not resurrect; public reads are cloned',t=>{
 const store=new InstallTaskStore({dataDir:temporary(t),profile});store.create({id:'x'});store.update('x',{status:'needs-attention',stage:'cancel-requested'});store.update('x',{status:'succeeded'});
 const row=store.get('x');row.events.length=0;assert.ok(store.get('x').events.length);assert.equal(taskReply(store.get('x')).ok,false);assert.equal(taskReply(null).known,false);
});
test('corrupt persistence fails closed instead of forgetting prior work',t=>{
 const dataDir=temporary(t),store=new InstallTaskStore({dataDir,profile});store.create({id:'x'});writeFileSync(store.file,'broken');assert.throws(()=>new InstallTaskStore({dataDir,profile}),/無法讀取/);
});
test('explicit parent selection required; no arbitrary root fallback',async()=>{
 const ctx=context();assert.deepEqual(listParents(ctx),{parents:[{id:'parent',label:'parent'}]});
 await assert.rejects(startTrackedSubagent(ctx,{...opts(),parentSessionId:undefined}),AttentionError);assert.equal(ctx.counts().starts,0);
});
test('legacy arbitrary id is not accepted as session id',async()=>{
 const ctx=context({id:'not-session',result:Promise.resolve({}),dispose:async()=>{}});
 await assert.rejects(startTrackedSubagent(ctx,opts()),AttentionError);
});
test('child session must be readable and exact before delegation acknowledged',async()=>{
 const ctx=context(undefined,async()=>({session:{id:'other'}}));await assert.rejects(startTrackedSubagent(ctx,opts()),AttentionError);assert.equal(ctx.counts().disposed,1);
});
test('awaits actual result; does not treat promise or unknown status as success',async()=>{
 const pending=deferred(),ctx=context({childId:'child',result:pending.promise,dispose:async()=>{}});const run=await startTrackedSubagent(ctx,opts());assert.equal(run.childSessionId,'child');
 let done=false;const result=awaitTrackedResult(run,new AbortController().signal,100).then(x=>{done=true;return x;});await Promise.resolve();assert.equal(done,false);pending.resolve({stopReason:'error',diagnostic:'secret'});assert.equal((await result).stopReason,'error');
});
test('startup timeout disposes late activation',async()=>{
 const pending=deferred(),ctx=context();ctx.services.subagents.startActivation=()=>pending.promise;
 await assert.rejects(startTrackedSubagent(ctx,{...opts(),timeoutMs:5}),AttentionError);
 let disposed=false;pending.resolve({childId:'late',result:Promise.resolve({}),dispose:async()=>{disposed=true;}});await new Promise(resolve=>setImmediate(resolve));assert.equal(disposed,true);
});
test('completion timeout and cancellation request interrupt without claiming stopped',async()=>{
 const ctx=context({childId:'child',result:new Promise(()=>{}),dispose:async()=>{}}),run=await startTrackedSubagent(ctx,opts());
 await assert.rejects(awaitTrackedResult(run,new AbortController().signal,5),AttentionError);assert.equal(ctx.counts().interrupts,1);
 const ac=new AbortController();ac.abort();await assert.rejects(awaitTrackedResult(run,ac.signal,100),AttentionError);assert.equal(ctx.counts().interrupts,2);
});
test('store ignores raw model/log/credential fields and deduplicates progress writes',t=>{
 const store=new InstallTaskStore({dataDir:temporary(t),profile});store.create({id:'safe'});
 const count=store.get('safe').events.length;
 store.update('safe',{log:'SECRET',reasoning:'SECRET',token:'SECRET'});
 assert.equal(store.get('safe').events.length,count);assert.doesNotMatch(readFileSync(store.file,'utf8'),/SECRET/);
});
test('provider rejection is observed and never returns a false delegation',async()=>{
 const ctx=context();ctx.services.subagents.startActivation=()=>{throw new Error('provider down');};
 await assert.rejects(startTrackedSubagent(ctx,opts()),/provider down/);
});
test('real UI owner/repository IDs persist and deduplicate while invalid IDs reject',t=>{
 const dataDir=temporary(t),store=new InstallTaskStore({dataDir,profile});
 const id=`omdsh-dev/DSH-better-sidebar-${Date.now()}`;
 assert.equal(store.create({id,pluginId:'omdsh-dev/DSH-better-sidebar',kind:'ai:install'}).record.id,id);
 assert.equal(store.create({id}).created,false);
 assert.equal(new InstallTaskStore({dataDir,profile}).get(id).status,'interrupted');
 for(const invalid of ['', '   ', 'a\n', 'a\u0000b', 'a\u007fb', 'a\u0085b', 'a'.repeat(161), 42]) assert.throws(()=>store.create({id:invalid}),/格式無效/);
});
test('async interrupt rejection is consumed on timeout and cancellation',async()=>{
 let interrupts=0;
 const run={result:new Promise(()=>{}),interrupt:async()=>{interrupts++;throw new Error('async interrupt unavailable');},dispose:async()=>{}};
 await assert.rejects(awaitTrackedResult(run,new AbortController().signal,5),AttentionError);
 const ac=new AbortController();ac.abort();await assert.rejects(awaitTrackedResult(run,ac.signal,100),AttentionError);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(interrupts,2);
});
test('tracked entry has no legacy watcher or arbitrary parent fallback',()=>{
 const source=readFileSync(new URL('./lib/index-tracked.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/watchInstallVerdict|watchReviewVerdict|pendingT1Installs|activeInstalls|subagent-compat|startSubagent\(/);
 assert.doesNotMatch(source,/roots\?\.\(\).*\[0\]/);
 assert.ok(source.indexOf('taskStore.create(')<source.indexOf('const plugin = (await market()).plugins.find(p=>'));
});
