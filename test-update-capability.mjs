import test from 'node:test';
import assert from 'node:assert/strict';
import {checkManagedSourceUpdates} from './lib/managed-source-updates.js';

const bundle=(changes={})=>({name:'@scope/plugin',source:'@scope/plugin@^1.0.0',version:'1.0.0',installed:true,availability:'profile',removable:true,...changes});
const item=(b,changes={})=>({localName:b.name,nativeBundle:b.name,pluginId:null,version:b.version,...changes});
function context(bundles,{profile={name:'current',dir:'C:/profile'},methods=true}={}) {
  const forbidden=()=>{throw new Error('query must never call a mutation or preflight');};
  const manager={listBundles:async()=>bundles,...(methods?{inspect:forbidden,removeBundle:forbidden,installBundle:forbidden}:{})};
  return {get:key=>key==='pluginManager'?manager:key==='profileContext'?profile:undefined};
}
const response=(version='2.0.0',status=200)=>({ok:status===200,status,headers:new Headers(),json:async()=>({'dist-tags':{latest:version}})});
const options=()=>({fetchImpl:async()=>response()});

test('scoped registry newer version is actionable; fresh installed host version wins',async()=>{
  const b=bundle();
  const [r]=await checkManagedSourceUpdates(context([b]),[item(b,{version:'0.1.0'})],options());
  assert.equal(r.current,'1.0.0'); assert.equal(r.latest,'2.0.0'); assert.equal(r.hasUpdate,true); assert.equal(r.canUpdate,true); assert.equal(r.unavailableReason,null);
  const upgraded=bundle({version:'2.0.0'});
  const [fresh]=await checkManagedSourceUpdates(context([upgraded]),[item(b)],options());
  assert.equal(fresh.current,'2.0.0'); assert.equal(fresh.hasUpdate,false); assert.equal(fresh.canUpdate,false); assert.ok(fresh.unavailableReason);
});
test('alias reports exact real scoped npm version but cannot use current mutation path',async()=>{
  const b=bundle({name:'alias',source:'alias@npm:@real/pkg@^1.0.0'}); const urls=[];
  const [r]=await checkManagedSourceUpdates(context([b]),[item(b)],{fetchImpl:async url=>{urls.push(url);return response();}});
  assert.equal(r.hasUpdate,true); assert.equal(r.canUpdate,false); assert.match(r.unavailableReason,/精確還原/); assert.deepEqual(urls,['https://registry.npmjs.org/%40real%2Fpkg']);
});
test('protected bundle still reports real newer version; false or missing removable denies update',async()=>{
  for(const removable of [false,undefined]){
    const b=bundle({removable}); const [r]=await checkManagedSourceUpdates(context([b]),[item(b)],options());
    assert.equal(r.hasUpdate,true); assert.equal(r.canUpdate,false); assert.match(r.unavailableReason,/保護/);
  }
});
test('self and non-profile sources cannot update; self avoids cross-channel comparison',async()=>{
  let calls=0; const opts={fetchImpl:async()=>{calls++;return response();}};
  for(const b of [bundle({name:'@dsh-market/plugin',source:'@dsh-market/plugin@latest'}),bundle({availability:'installation'}),bundle({installed:false})]){
    const [r]=await checkManagedSourceUpdates(context([b]),[item(b)],opts);
    assert.equal(r.canUpdate,false); assert.equal(r.hasUpdate,null); assert.ok(r.unavailableReason);
  }
  assert.equal(calls,0);
});
test('git/local sources remain unsupported even with published GitHub release',async()=>{
  for(const source of ['github:owner/repo','file:../local','C:/local','https://example.com/a.tgz']){
    const b=bundle({source}); const [r]=await checkManagedSourceUpdates(context([b]),[item(b)],{fetchImpl:async()=>({ok:true,status:200,json:async()=>({tag_name:'v9.0.0'})})});
    assert.equal(r.canUpdate,false); assert.equal(r.hasUpdate,null); assert.equal(r.latest,null); assert.ok(r.unavailableReason);
    if(source.startsWith('github:')) assert.equal(r.sourceObservation.version,'9.0.0');
  }
});
test('missing rollback version cannot update even if old UI snapshot is comparable',async()=>{
  for(const version of [undefined,'main','1.0.0-alpha+build']){
    const b=bundle({version}); const [r]=await checkManagedSourceUpdates(context([b]),[item(b,{version:'1.0.0'})],options());
    assert.equal(r.canUpdate,false); assert.match(r.unavailableReason,/精確還原/);
    if(version===undefined) assert.equal(r.hasUpdate,true); // observation and capability differ
  }
  const b=bundle({version:undefined}); const [r]=await checkManagedSourceUpdates(context([b]),[item(b)],options());
  assert.equal(r.current,null); assert.equal(r.hasUpdate,null); assert.equal(r.canUpdate,false);
});
test('missing/mismatched profile and unavailable manager operations do not hide new version',async()=>{
  const b=bundle();
  for(const [ctx,opts] of [[context([b],{profile:null}),options()],[context([b]),{...options(),targetProfile:'other'}],[context([b],{methods:false}),options()]]){
    const [r]=await checkManagedSourceUpdates(ctx,[item(b)],opts); assert.equal(r.hasUpdate,true); assert.equal(r.canUpdate,false); assert.ok(r.unavailableReason);
  }
});
test('failed query and stale cached success cannot permit update',async()=>{
  const b=bundle(); let fail=false;
  const fetchImpl=async()=>response('2.0.0',fail?503:200);
  const [first]=await checkManagedSourceUpdates(context([b]),[item(b)],{fetchImpl}); assert.equal(first.canUpdate,true);
  fail=true;
  const [failed]=await checkManagedSourceUpdates(context([b]),[item(b)],{fetchImpl,force:true});
  assert.equal(failed.status,'error'); assert.equal(failed.stale,true); assert.equal(failed.latest,'2.0.0'); assert.equal(failed.hasUpdate,null); assert.equal(failed.canUpdate,false); assert.match(failed.unavailableReason,/查詢未成功/);
});
test('per-item unexpected error does not abort other rows or expose raw exceptions',async()=>{
  const bad=bundle({name:'bad'}); Object.defineProperty(bad,'source',{get(){throw Error('secret-credential');}});
  const good=bundle();
  const results=await checkManagedSourceUpdates(context([bad,good]),[item(bad),item(good),null],options());
  assert.equal(results.length,3); assert.equal(results[0].status,'error'); assert.equal(results[0].canUpdate,false); assert.ok(results[0].unavailableReason); assert.equal(results[1].canUpdate,true); assert.equal(results[2].status,'error'); assert.ok(!JSON.stringify(results).includes('secret-credential'));
});
test('inventory failure returns explicit error for each requested row',async()=>{
  const b=bundle(); const ctx={get:()=>({listBundles:async()=>{throw Error('secret');}})};
  const [r]=await checkManagedSourceUpdates(ctx,[item(b)],options()); assert.equal(r.status,'error'); assert.equal(r.hasUpdate,null); assert.equal(r.canUpdate,false); assert.ok(r.unavailableReason); assert.ok(!JSON.stringify(r).includes('secret'));
});
