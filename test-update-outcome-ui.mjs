import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=fs.readFileSync(new URL('./lib/client-tasks.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const walk=n=>!n||typeof n!=='object'?[]:[n,...(n.children||[]).flatMap(walk)];
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join(' ');
const button=(tree,label)=>walk(tree).find(n=>n.type==='button'&&text(n)===label);
const item={localName:'@native/a',nativeBundle:'@native/a',pluginId:null,version:'1.0.0'};
const sourceRecord={localName:item.localName,current:'1.0.0',latest:'2.0.0',status:'ok',hasUpdate:true,canUpdate:true};
const versionCheck={before:'1.0.0',expected:'2.0.0',installed:'2.0.0',inventory:'fresh',status:'verified',checkedAt:12345};
function harness(handler){
 let exported,cursor=0,id=0;const cells=[],effects=[],calls=[],timers=new Map();
 const react={Component:class {},createElement:(type,props,...children)=>({type,props:props||{},children}),
 useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v;}];},
 useRef(initial){const i=cursor++;return cells[i]||=( {current:initial} );},
 useEffect(fn,deps){const i=cursor++,old=cells[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))effects.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};});}};
 const document={querySelector:()=>({}),querySelectorAll:()=>[],createElement:()=>({setAttribute(){},remove(){}}),body:{appendChild(){}}};
 const context={console,AbortController,document,setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:n=>timers.delete(n),
 fetch:async(url,opts)=>{const request=JSON.parse(opts.body);calls.push({...request,signal:opts.signal});const result=await handler(request.method,request.args,opts.signal);return{json:async()=>({ok:true,result})};},
 window:{location:{reload(){assert.fail('Updates must not reload the page');}},__ModuleLoader__:{load:({factory})=>{exported=factory(()=>react);}}}};
 vm.runInNewContext(source.replace('exports.apply = apply;','exports.testing={InstalledTab,updateOutcomeView};exports.apply = apply;'),context);
 return{...exported.testing,calls,render(props){cursor=0;const tree=exported.testing.InstalledTab(props);while(effects.length)effects.shift()();return tree;},unmount(){for(const cell of cells)cell?.cleanup?.();}};
}
const resultText=result=>{const h=harness(async()=>[]),view=h.updateOutcomeView(result);return{...view,all:[view.summary,...view.lines].join(' ')};};

test('only precise fresh version verification permits a completed result',()=>{
 const base={ok:true,applied:true,version:'2.0.0',versionCheck};
 assert.equal(resultText(base).success,true);assert.match(resultText(base).summary,/更新完成/);
 for(const check of [undefined,...['unknown','unchanged','mismatch'].map(status=>({...versionCheck,status})),{...versionCheck,installed:'1.0.0'}]){
  const result=resultText({...base,versionCheck:check});assert.equal(result.success,false);assert.doesNotMatch(result.summary,/更新完成/);
 }
 assert.equal(resultText({...base,needsAttention:true}).success,false);
 assert.equal(resultText({...base,ok:false}).success,false);
});

test('API-reported version, expected version and actual inventory version remain distinct',()=>{
 const view=resultText({ok:true,version:'9.9.9',versionCheck:{...versionCheck,status:'mismatch',installed:'1.0.0'}});
 assert.match(view.all,/目標版本：2.0.0/);assert.match(view.all,/實際安裝版本（重新讀取套件清單）：1.0.0/);
 assert.match(view.all,/API 回報版本（不等同實際核對）：9.9.9/);assert.match(view.all,/版本與目標不一致/);assert.equal(view.success,false);
});

test('restart instructions require an explicit native restartRequired flag',()=>{
 for(const status of ['applied','restart-required']){
  const noRestart=resultText({ok:true,application:status,activation:{state:'restart'},versionCheck,rollback:{ok:true,application:'restart-required'}});
  assert.doesNotMatch(noRestart.all,/手動重開|需要重啟|需要重開|重開 DSH/);
 }
 const restart=resultText({ok:true,versionCheck,restartRequired:true,restartReason:'native activation pending'});
 assert.match(restart.all,/宿主要求手動重開 DSH/);assert.match(restart.all,/native activation pending/);assert.match(restart.all,/不會自動重啟/);
});

test('compatibility failures and rollback reasons survive row rendering and every outcome refreshes inventory',async()=>{
 for(const outcome of [
  {ok:false,error:'incompatible: requires DSH >=2',versionCheck:{...versionCheck,status:'unchanged',installed:'1.0.0'}},
  {ok:false,error:'native failed',rollback:{attempted:true,ok:true},versionCheck:{...versionCheck,status:'unchanged',installed:'1.0.0'}},
  {ok:false,error:'native failed',rollback:{attempted:true,ok:false,error:'restore blocked'},versionCheck:{...versionCheck,status:'mismatch',installed:'0.9.0'}},
  {ok:true,version:'2.0.0',needsAttention:true,versionCheck:{...versionCheck,status:'unknown',installed:null,reason:'inventory unavailable'}},
  {ok:true,version:'2.0.0',versionCheck,restartRequired:true,restartReason:'native requires restart'},
 ]){
  let changed=0;const h=harness(async method=>method==='update:apply'?outcome:[sourceRecord]);const props={installed:[item],loading:false,onChanged(){changed++;}};
  h.render(props);await flush();button(h.render(props),'一鍵更新').props.onClick();await flush();
  assert.equal(changed,1);assert.equal(h.calls.filter(c=>c.method==='update:apply').length,1);
  assert.equal(h.calls.at(-1).method,'update:check');assert.equal(h.calls.at(-1).args.force,true);
  const tree=h.render(props), row=walk(tree).find(n=>n.props['data-update-outcome']===item.localName);assert.ok(row,'result remains adjacent to the exact installed item');
  const rowText=text(row);assert.match(rowText,/版本核對/);assert.match(rowText,/實際安裝版本/);
  if(outcome.error)assert.match(rowText,new RegExp(outcome.error.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  if(outcome.rollback?.ok===true)assert.match(rowText,/回復成功/);
  if(outcome.rollback?.ok===false)assert.match(rowText,/回復失敗：restore blocked/);
  if(outcome.versionCheck.status!=='verified')assert.doesNotMatch(rowText,/更新完成/);
  if(outcome.restartRequired)assert.match(rowText,/手動重開 DSH/);else assert.doesNotMatch(rowText,/手動重開 DSH/);
  button(row,'重新檢測版本').props.onClick();await flush();assert.equal(changed,2);assert.equal(h.calls.at(-1).method,'update:check');assert.equal(h.calls.at(-1).args.force,true);
  assert.equal(h.calls.filter(c=>c.method==='update:apply').length,1,'manual version recheck never repeats install');
  assert.ok(walk(h.render({...props,installed:[{...item,version:outcome.versionCheck.installed||item.version}]})).some(n=>n.props['data-update-outcome']===item.localName),'inventory refresh does not erase the prior operation result');
  assert.ok(h.calls.every(c=>['update:check','update:apply'].includes(c.method)));h.unmount();
 }
});

test('transport failure is unknown, refreshes both views and cannot claim rollback or success',async()=>{
 let changed=0;const h=harness(async method=>{if(method==='update:apply')throw new Error('connection lost');return[sourceRecord];});const props={installed:[item],loading:false,onChanged(){changed++;}};
 h.render(props);await flush();button(h.render(props),'一鍵更新').props.onClick();await flush();
 const row=walk(h.render(props)).find(n=>n.props['data-update-outcome']===item.localName);assert.match(text(row),/更新結果未確認/);assert.match(text(row),/connection lost/);assert.doesNotMatch(text(row),/更新完成|回復成功|手動重開 DSH/);
 assert.equal(changed,1);assert.equal(h.calls.at(-1).method,'update:check');assert.equal(h.calls.at(-1).args.force,true);h.unmount();
});
