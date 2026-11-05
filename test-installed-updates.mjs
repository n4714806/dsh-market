import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = fs.readFileSync(new URL('./lib/client-tasks.js', import.meta.url), 'utf8');
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;}); return {promise,resolve,reject}; };
const flush = async () => { for(let i=0;i<15;i++) await Promise.resolve(); };
const walk = n => !n || typeof n !== 'object' ? [] : [n,...(n.children || []).flatMap(walk)];
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join(' ');
const button = (tree,label) => walk(tree).find(n=>n.type==='button'&&text(n)===label);
const native = {localName:'@native/a',nativeBundle:'@native/a',pluginId:null,version:'1.0.0',source:'profile'};
const available = {localName:native.localName,current:'1.0.0',latest:'2.0.0',hasUpdate:true,status:'ok',canUpdate:true};
function harness(handler = async()=>[]) {
 let exported, cursor=0, seq=0; const cells=[], pending=[], timers=new Map(), calls=[];
 const react={Component:class {},createElement:(type,props,...children)=>({type,props:props||{},children}),
 useState(initial){const i=cursor++; if(!(i in cells)) cells[i]=typeof initial==='function'?initial():initial; return [cells[i],value=>{cells[i]=typeof value==='function'?value(cells[i]):value;}];},
 useRef(value){const i=cursor++; return cells[i] ||= {current:value};},
 useEffect(fn,deps){const i=cursor++, old=cells[i]; if(!old || deps.some((d,j)=>!Object.is(d,old.deps[j]))) {pending.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};});}}
 };
 const document={querySelector:()=>({}),querySelectorAll:()=>[],createElement:()=>({setAttribute(){},remove(){}}),body:{appendChild(){}}};
 const context={console,AbortController,document,setTimeout:(fn,delay)=>{timers.set(++seq,{fn,delay});return seq;},clearTimeout:id=>timers.delete(id),
 fetch:async(url,opts)=>{const data=JSON.parse(opts.body);calls.push({...data,signal:opts.signal});const result=await handler(data.method,data.args,opts.signal);return {json:async()=>({ok:true,result})};},
 window:{__ModuleLoader__:{load:({factory})=>{exported=factory(()=>react);}}}};
 vm.runInNewContext(source.replace('exports.apply = apply;','exports.testing={InstalledTab,installedUpdateAvailability,createInstalledUpdateCheck}; exports.apply = apply;'),context);
 return {...exported.testing,calls,timers,render(props){cursor=0;const tree=exported.testing.InstalledTab(props);while(pending.length) pending.shift()();return tree;},unmount(){for(const cell of cells) cell?.cleanup?.();},fire(delay){const [id,timer]=[...timers].find(([,t])=>t.delay===delay);timers.delete(id);timer.fn();}};
}
test('entry checks cached sources automatically; manual check forces refresh without installing',async()=>{
 const h=harness(async()=>[available]), props={installed:[native],loading:false,onChanged(){}};
 assert.match(text(h.render(props)),/尚未取得來源版本/); assert.equal(h.calls[0].method,'update:check');assert.equal(h.calls[0].args.force,false);
 assert.match(text(h.render(props)),/檢查中/);await flush();
 const tree=h.render(props);assert.match(text(tree),/1.0.0 → 2.0.0/);assert.ok(button(tree,'一鍵更新'));assert.equal(h.calls.length,1);
 button(tree,'检查更新').props.onClick();await flush();assert.equal(h.calls[1].args.force,true);assert.ok(h.calls.every(c=>c.method==='update:check'));h.unmount();
});
test('safe one-click uses native null-id identity once and refreshes list plus versions',async()=>{
 const apply=deferred();let changed=0;
 const h=harness(async method=>method==='update:apply'?apply.promise:[available]);const props={installed:[native],loading:false,onChanged(){changed++;}};
 h.render(props);await flush();const tree=h.render(props), update=button(tree,'一鍵更新');
 update.props.onClick();update.props.onClick();button(tree,'验证').props.onClick();button(tree,'检查更新').props.onClick();
 assert.equal(h.calls.filter(c=>c.method==='update:apply').length,1);assert.equal(h.calls.filter(c=>c.method==='verify').length,0);
 assert.equal(JSON.stringify(h.calls.find(c=>c.method==='update:apply').args),JSON.stringify({localName:native.localName}));
 assert.equal(button(h.render(props),'更新中…').props.disabled,true);
 apply.resolve({ok:true,application:'applied',applied:true});await flush();assert.equal(changed,1);assert.equal(h.calls.at(-1).method,'update:check');assert.equal(h.calls.at(-1).args.force,true);assert.match(text(h.render(props)),/更新完成/);h.unmount();
});
test('unsafe source exposes newer version and reason, never one-click action',async()=>{
 const h=harness(async()=>[{...available,canUpdate:false,unavailableReason:'manual-only'}]);const props={installed:[native],loading:false,onChanged(){}};
 h.render(props);await flush();const tree=h.render(props);assert.match(text(tree),/1.0.0 → 2.0.0/);assert.match(text(tree),/不可安全更新：manual-only/);assert.equal(button(tree,'一鍵更新'),undefined);h.unmount();
 assert.equal(h.installedUpdateAvailability(native,{...available,canUpdate:undefined}).allowed,true);
 assert.equal(h.installedUpdateAvailability({...native,removable:false},available).allowed,false);
 assert.equal(h.installedUpdateAvailability(native,{...available,error:'offline'}).allowed,false);
 assert.equal(h.installedUpdateAvailability(native,{...available,stale:true}).allowed,false);
});
test('up-to-date rows and failed queries remain explicit, not absent',async()=>{
 let failed=false;const h=harness(async()=>{if(failed)throw new Error('offline');return [{...available,hasUpdate:false,latest:'1.0.0',comparison:0}];});const props={installed:[native],loading:false,onChanged(){}};
 h.render(props);await flush();assert.match(text(h.render(props)),/已符合此安裝來源/);
 failed=true;button(h.render(props),'检查更新').props.onClick();await flush();assert.match(text(h.render(props)),/查詢失敗：offline/);assert.equal(button(h.render(props),'一鍵更新'),undefined);h.unmount();
});
test('update failures describe rollback and never claim success or auto retry',async()=>{
 let changed=0;const h=harness(async method=>method==='update:apply'?{ok:false,error:'install failed',rollback:{attempted:true,ok:true}}:[available]);const props={installed:[native],loading:false,onChanged(){changed++;}};
 h.render(props);await flush();button(h.render(props),'一鍵更新').props.onClick();await flush();const result=text(h.render(props));assert.match(result,/更新失败/);assert.match(result,/回復成功/);assert.doesNotMatch(result,/更新完成/);assert.equal(changed,0);assert.equal(h.calls.length,2);h.unmount();
});
test('60 second batch timeout is retryable and ignores late/aborted responses',async()=>{
 const h=harness(), seen=[], errors=[], busy=[], calls=[];let pending=deferred();
 const checker=h.createInstalledUpdateCheck(v=>seen.push(v),e=>errors.push(e),v=>busy.push(v),(method,args,opts)=>{calls.push({method,args,...opts});return pending.promise;});
 const first=checker.run(false);assert.equal(checker.busy,true);await checker.run(true);assert.equal(calls.length,1);
 h.fire(60000);await first;assert.equal(calls[0].signal.aborted,true);assert.match(errors.at(-1),/60 秒/);assert.equal(checker.busy,false);
 const old=pending;pending=deferred();const second=checker.run(true);old.resolve([available]);await flush();assert.equal(seen.length,0);
 pending.resolve([{...available,latest:'3.0.0'}]);await second;assert.equal(seen[0][native.localName].latest,'3.0.0');assert.equal(calls[1].args.force,true);
 pending=deferred();const third=checker.run();checker.stop();assert.equal(calls[2].signal.aborted,true);await third;pending.resolve([available]);await flush();assert.equal(seen.length,1);assert.equal(h.timers.size,0);
});
test('unmounted updates abort and cannot publish stale results',async()=>{
 const pending=deferred();let changed=0;const h=harness(async method=>method==='update:apply'?pending.promise:[available]);const props={installed:[native],loading:false,onChanged(){changed++;}};
 h.render(props);await flush();button(h.render(props),'一鍵更新').props.onClick();h.unmount();assert.equal(h.calls.at(-1).signal.aborted,true);pending.resolve({ok:true,applied:true});await flush();assert.equal(changed,0);
 assert.match(source,/任務追蹤版 \.3/);assert.doesNotMatch(source,/api\("update:self"/);
});
