import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { currentProfile, requireTargetProfile } from './lib/profile-runtime.js';
import { nativeInstall, installSpec } from './lib/native-install-progress.js';
const plugin={id:'elysia395/dsh-wallpaper-engine',type:'cordis-plugin',install:{commands:['dsh plugin --profile web add dsh-plugin-wallpaper-engine']}};
let count=0;
const test=async(name,run)=>{await run();count++;console.log(`PASS ${name}`)};
function fixture(profile={name:'desktop',dir:'C:\\app-data\\custom-profile'}) {
  const calls=[];
  const manager={inspect:async spec=>{calls.push(['inspect',spec]);return {status:'accepted'};},installBundle:async(spec,options)=>{calls.push(['install',spec,options]);return {application:'applied',bundle:'dsh-plugin-wallpaper-engine',version:'1.4.0'};},cancelInstall:async()=>({status:'cancelled'})};
  const ctx={get:key=>key==='profileContext'?profile:key==='pluginManager'?manager:undefined};
  return {ctx,manager,calls};
}
for (const profile of [{name:'desktop',dir:'C:\\custom\\application-owned'},{name:'web',dir:'/srv/dsh/web'},{name:'cli-work',dir:'/opt/profiles/nonmatching-folder'}]) {
  await test(`host profile ${profile.name}`,async()=>{
    const {ctx,calls}=fixture(profile);
    assert.deepEqual(currentProfile(ctx),{...profile,source:'host'});
    const r=await nativeInstall(ctx,plugin,{});
    assert.equal(r.profile,profile.name);assert.equal(r.application,'applied');
    assert.equal(calls[1][1],'dsh-plugin-wallpaper-engine');
    assert.equal(calls[1][2].approvedBuilds,undefined);
  });
}
await test('host wins over misleading environment',()=>{
  const before=process.env.DSH_PROFILE;process.env.DSH_PROFILE='wrong-profile';
  try{assert.equal(currentProfile(fixture().ctx).name,'desktop');}finally{if(before===undefined)delete process.env.DSH_PROFILE;else process.env.DSH_PROFILE=before;}
});
await test('missing host facts never guess desktop or web',async()=>{
  const {ctx,calls}=fixture(null);assert.equal(currentProfile(ctx),null);
  await assert.rejects(nativeInstall(ctx,plugin,{}),/profile/);assert.equal(calls.length,0);
});
await test('explicit foreign profile is rejected before mutation',async()=>{
  const {ctx,calls}=fixture();assert.throws(()=>requireTargetProfile(ctx,'web'),/不能/);
  await assert.rejects(nativeInstall(ctx,plugin,{targetProfile:'web'}),/不能/);assert.equal(calls.length,0);
});
await test('missing manager does not invoke shell or AI',async()=>{
  await assert.rejects(nativeInstall({get:k=>k==='profileContext'?{name:'web',dir:'/custom'}:undefined},plugin,{}),/管理器不可用/);
});
await test('dry run is non-mutating and identifies host profile',async()=>{
  const {ctx,calls}=fixture();const r=await nativeInstall(ctx,plugin,{dryRun:true});assert.equal(r.profile,'desktop');assert.equal(r.dryRun,true);assert.equal(calls.length,0);
});
await test('review opt-in cannot silently bypass review',async()=>{
  const {ctx,calls}=fixture();await assert.rejects(nativeInstall(ctx,plugin,{security:true}),/安全審查/);assert.equal(calls.length,0);
});
await test('shell injection is not interpreted',()=>{
  assert.equal(installSpec({...plugin,install:{commands:['dsh plugin add evil; calc.exe']}}),'github:elysia395/dsh-wallpaper-engine');
});
await test('inspection refusal stops install',async()=>{
  const {ctx,manager,calls}=fixture();manager.inspect=async()=>({status:'refused',problem:'already-installed',reason:'Already installed'});
  await assert.rejects(nativeInstall(ctx,plugin,{}),/Already installed/);assert.equal(calls.length,0);
});
for (const application of ['failed','overridden','cancelled']) await test(`failure ${application} is never success`,async()=>{
  const {ctx,manager}=fixture();manager.installBundle=async()=>({application});await assert.rejects(nativeInstall(ctx,plugin,{}));
});
await test('restart is reported, not called active',async()=>{
  const {ctx,manager}=fixture();manager.installBundle=async()=>({application:'restart-required'});assert.equal((await nativeInstall(ctx,plugin,{})).application,'restart-required');
});
await test('pending builds require separate user approval',async()=>{
  const {ctx,manager}=fixture();manager.installBundle=async()=>({application:'failed',pendingBuilds:['some-build']});await assert.rejects(nativeInstall(ctx,plugin,{}),/確認建置腳本/);
});
await test('abort before starting never installs',async()=>{
  const {ctx,calls}=fixture();const ac=new AbortController();ac.abort();await assert.rejects(nativeInstall(ctx,plugin,{},ac.signal));assert.equal(calls.length,0);
});
await test('abort during manager installation cancels that request only',async()=>{
  const {ctx,manager}=fixture();let entered,finish;const started=new Promise(r=>entered=r);let requestId;
  manager.installBundle=async(_spec,opts)=>{requestId=opts.requestId;entered();return new Promise(r=>finish=r)};
  manager.cancelInstall=async id=>{assert.equal(id,requestId);finish({application:'cancelled'});return {status:'cancelled'}};
  const ac=new AbortController();const pending=nativeInstall(ctx,plugin,{installId:'test'},ac.signal);await started;ac.abort();await assert.rejects(pending,/cancelled/);
});
await test('active entry has no fixed desktop/env routing and preserves polling records',()=>{
  const s=readFileSync(new URL('./lib/index-optimized-v2.js',import.meta.url),'utf8');
  assert.ok(!s.includes('"desktop"'));assert.ok(!s.includes('process.env.DSH_PROFILE'));
  assert.ok(s.includes('requireTargetProfile(ctx, args.targetProfile)'));
  assert.ok(s.includes('semanticModel(ctx, prompt)'));
  assert.ok(!s.includes('finishedInstalls.delete(id)'));
});
console.log(`${count} tests passed. Simulated Host contexts; no real CLI/Web server or paid AI request.`);
