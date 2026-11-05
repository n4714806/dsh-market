import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=fs.readFileSync(new URL('./lib/client-tasks.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const walk=n=>Array.isArray(n)?n.flatMap(walk):!n||typeof n!=='object'?[]:[n,...(n.children||[]).flatMap(walk)];
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):(n?.children||[]).map(text).join(' ');
const button=(tree,label)=>walk(tree).find(n=>n.type==='button'&&text(n)===label);
const base={id:'analysis-1',packageName:'dsh-better-sidebar',status:'analyzed',stage:'diagnosis-complete',message:'ready',running:false,runtimeVersion:'1.0.0-rc.2',sourceVersion:'0.28.3',createdAt:1,updatedAt:2};
function harness(handler=async()=>[]){
 let exposed,scope,cursor=0,next=0,writes=0;const scopes=new Map(),pending=[],timers=new Map(),calls=[],copied=[];
 const document={hidden:false,listeners:new Set(),querySelector:()=>({}),addEventListener(_,fn){this.listeners.add(fn);},removeEventListener(_,fn){this.listeners.delete(fn);},change(hidden){this.hidden=hidden;for(const fn of this.listeners)fn();}};
 const react={Component:class{},createElement:(type,props,...children)=>({type,props:props||{},children}),useSyncExternalStore:()=>true,
 useState(initial){const i=cursor++,cells=scope;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{writes++;cells[i]=typeof v==='function'?v(cells[i]):v;}];},
 useRef(initial){const i=cursor++;return scope[i]||={current:initial};},
 useEffect(fn,deps){const i=cursor++,cells=scope,old=cells[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))pending.push(()=>{old?.cleanup?.();cells[i]={deps,cleanup:fn()};});}};
 const ctx={console,AbortController,document,navigator:{clipboard:{async writeText(value){copied.push(value);}}},localStorage:{getItem:()=>null},setTimeout:(fn,delay)=>{timers.set(++next,{fn,delay});return next;},clearTimeout:id=>timers.delete(id),
 fetch:async(url,opts)=>{const request=JSON.parse(opts.body);calls.push({...request,signal:opts.signal});const result=await handler(request.method,request.args,opts.signal);return{json:async()=>({ok:true,result})};},
 window:{__ModuleLoader__:{load:({factory})=>{exposed=factory(()=>react);}}}};
 vm.runInNewContext(source.replace('exports.apply = apply;','exports.testing={CompatTab,CompatRecordCard,watchCompatRecords,compatReportMetadata,MarketPanel};exports.apply = apply;'),ctx);
 const api=exposed.testing;
 return{...api,calls,copied,timers,document,get writes(){return writes;},render(fn=api.CompatTab,props={},key=fn){scope=scopes.get(key)||[];scopes.set(key,scope);cursor=0;const tree=fn(props);while(pending.length)pending.shift()();return tree;},unmount(){for(const cells of scopes.values())for(const cell of cells)cell?.cleanup?.();},fire(delay){const entry=[...timers].find(([,timer])=>timer.delay===delay);assert.ok(entry,`timer ${delay} exists`);const[id,timer]=entry;timers.delete(id);return timer.fn();}};
}
function recordNode(h,tree,id=base.id){const node=walk(tree).find(n=>n.type===h.CompatRecordCard&&n.props.record.id===id);assert.ok(node);return node;}

test('mount and manual refresh only list; workbench has no installation endpoint or action',async()=>{
 const h=harness(async()=>[]);let tree=h.render();await flush();tree=h.render();
 assert.equal(h.calls.length,1);assert.equal(h.calls[0].method,'compat:list');assert.equal(h.timers.size,0);
 assert.equal(walk(tree).find(n=>n.type==='input').props.value,'dsh-better-sidebar');
 button(tree,'重新整理相容任務').props.onClick();await flush();assert.deepEqual(h.calls.map(c=>c.method),['compat:list','compat:list']);
 assert.ok(walk(h.render(h.MarketPanel,{mode:'main',onClose(){}})).some(n=>n.type==='button'&&text(n)==='相容修補'));
 const workbench=source.slice(source.indexOf('function compatText('),source.indexOf('function sourceObservationText('));
 assert.doesNotMatch(workbench,/api\("(?:ai:install|update:apply|restart|install|set-version-exemption)/);
 assert.match(text(tree),/不安裝/);assert.match(text(tree),/不執行第三方/);h.unmount();
});

test('source diagnosis is explicit, request-keyed and duplicate clicks cannot overlap',async()=>{
 const pending=deferred();let records=[];const h=harness(async method=>method==='compat:prepare'?pending.promise:records);
 h.render();await flush();const tree=h.render(),prepare=button(tree,'診斷相容來源（不使用 AI）');prepare.props.onClick();prepare.props.onClick();
 assert.equal(h.calls.filter(c=>c.method==='compat:prepare').length,1);const call=h.calls.at(-1);assert.equal(call.args.packageName,'dsh-better-sidebar');assert.match(call.args.requestId,/^compat-/);
 records=[base];pending.resolve(base);await flush();assert.ok(recordNode(h,h.render()));assert.ok(h.calls.every(c=>['compat:list','compat:prepare'].includes(c.method)));h.unmount();
});

test('paid generation requires explicit consent and click, uses one request, and is never retried after lost response',async()=>{
 const h=harness(async method=>{if(method==='compat:generate')throw new Error('connection lost');return[base];});
 h.render();await flush();const node=recordNode(h,h.render());let card=h.render(h.CompatRecordCard,node.props,base.id);
 assert.match(text(card),/4096/);assert.match(text(card),/90 秒/);assert.match(text(card),/全域預設模型/);assert.match(text(card),/可能計費/);
 let generate=button(card,'AI準備未驗證草稿');assert.equal(generate.props.disabled,true);generate.props.onClick();assert.equal(h.calls.filter(c=>c.method==='compat:generate').length,0);
 walk(card).find(n=>n.type==='input').props.onChange({target:{checked:true}});card=h.render(h.CompatRecordCard,node.props,base.id);generate=button(card,'AI準備未驗證草稿');assert.equal(generate.props.disabled,false);
 generate.props.onClick();generate.props.onClick();await flush();const calls=h.calls.filter(c=>c.method==='compat:generate');assert.equal(calls.length,1);assert.equal(calls[0].args.id,base.id);assert.match(calls[0].args.requestId,/^compat-/);
 let tree=h.render();assert.match(text(tree),/connection lost/);assert.match(text(tree),/不會自動重送 AI/);button(tree,'重新整理相容任務').props.onClick();await flush();assert.equal(h.calls.filter(c=>c.method==='compat:generate').length,1);h.unmount();
});

test('official options and unverified drafts have truthful status, raw patches, and no green not-run marks',()=>{
 const h=harness();const official={...base,status:'official-option',officialOption:{version:'0.28.2',reason:'declared compatible'}};
 const option=h.render(h.CompatRecordCard,{record:official,busy:false,onAction(){}},'official');assert.match(text(option),/找到宣告相容的官方舊版，尚未安裝或功能驗證/);assert.match(text(option),/額外選擇，不是推薦動作/);assert.ok(button(option,'仍為最新版準備 AI 草稿'));
 const draft={...base,id:'draft',status:'needs-review',ai:{provider:'<img src=x>',model:'<script>bad</script>',status:'completed'},report:{summary:'<img onerror=bad>',risks:['unverified'],patches:[{path:'lib/简体.js',oldText:'原始错误',newText:'替换设置',reason:'draft only'}]},checks:{structure:'passed',syntax:'not-run',runtime:'not-run',visual:'not-run'},artifact:{id:'artifact-1',sha256:'abc'}};
 const card=h.render(h.CompatRecordCard,{record:draft,busy:false,onAction(){}},'draft');assert.match(text(card),/未驗證草稿，不能直接安裝/);assert.match(text(card),/未執行（not-run）/);assert.doesNotMatch(text(card),/[✓✅]/);
 assert.ok(walk(card).some(n=>n.type==='pre'&&text(n)==='原始错误'));assert.ok(walk(card).some(n=>n.type==='pre'&&text(n)==='替换设置'));
 assert.ok(walk(card).every(n=>!n.props.dangerouslySetInnerHTML));assert.match(text(card),/<script>bad<\/script>/);assert.equal(button(card,'AI準備未驗證草稿'),undefined);
 assert.equal(JSON.parse(h.compatReportMetadata(draft)).report.patches[0].newText,'替换设置');h.unmount();
});

test('unsupported, failed, cancelled and interrupted do not offer automatic generation or fake success',()=>{
 const h=harness();for(const status of ['unsupported','failed','cancelled','interrupted']){
  const card=h.render(h.CompatRecordCard,{record:{...base,status,error:status==='failed'?'parse failed':undefined},busy:false,onAction(){}},status);
  assert.equal(button(card,'AI準備未驗證草稿'),undefined);assert.equal(button(card,'仍為最新版準備 AI 草稿'),undefined);assert.doesNotMatch(text(card),/安裝完成|功能正常。/);
  if(status==='failed')assert.match(text(card),/parse failed/);if(status==='interrupted')assert.match(text(card),/不會自動恢復生成/);
 }h.unmount();
});

test('cancel acceptance and readonly upstream observations never trigger draft generation',async()=>{
 const running={...base,status:'running',running:true};let accepted=true;
 const h=harness(async method=>method==='compat:cancel'?{accepted,ok:false}:method==='compat:check-upstream'?{version:'0.28.4',message:'observation only'}:[running]);
 h.render();await flush();let node=recordNode(h,h.render()),card=h.render(h.CompatRecordCard,node.props,base.id);
 button(card,'取消相容任務').props.onClick();await flush();assert.match(text(h.render()),/已送出取消請求/);assert.doesNotMatch(text(h.render()),/取消失敗/);
 accepted=false;node=recordNode(h,h.render());card=h.render(h.CompatRecordCard,node.props,base.id);button(card,'取消相容任務').props.onClick();await flush();assert.match(text(h.render()),/未接受取消/);
 node=recordNode(h,h.render());card=h.render(h.CompatRecordCard,node.props,base.id);button(card,'唯讀檢查上游').props.onClick();await flush();node=recordNode(h,h.render());assert.equal(node.props.observation.version,'0.28.4');assert.ok(h.calls.every(c=>['compat:list','compat:cancel','compat:check-upstream'].includes(c.method)));h.unmount();
});

test('artifact export copies the complete JSON, not just metadata or an install command',async()=>{
 const record={...base,status:'needs-review',artifact:{id:'artifact-1',sha256:'abc'}},artifact={sourceSnapshot:{'lib/原始.js':'原始错误'},patches:[{path:'lib/原始.js',oldText:'原始错误',newText:'草稿设置'}],verified:false};
 const h=harness(async method=>method==='compat:artifact'?artifact:[record]);h.render();await flush();const node=recordNode(h,h.render()),card=h.render(h.CompatRecordCard,node.props,base.id);
 assert.match(text(card),/不是可安裝套件/);button(card,'匯出草稿 JSON（複製）').props.onClick();await flush();assert.deepEqual(JSON.parse(h.copied[0]),artifact);assert.match(text(h.render()),/已複製完整草稿 JSON/);
 assert.equal(h.calls.find(c=>c.method==='compat:artifact').args.id,record.id);assert.ok(h.calls.every(c=>['compat:list','compat:artifact'].includes(c.method)));h.unmount();
});

test('lost action acknowledgement times out without retry and permits readonly refresh',async()=>{
 const pending=deferred();const h=harness(async method=>method==='compat:prepare'?pending.promise:[]);h.render();await flush();button(h.render(),'診斷相容來源（不使用 AI）').props.onClick();h.fire(15000);await flush();
 assert.match(text(h.render()),/背景工作結果未知/);assert.equal(button(h.render(),'重新整理相容任務').props.disabled,false);assert.equal(h.calls.filter(c=>c.method==='compat:prepare').length,1);
 pending.resolve(base);await flush();assert.equal(walk(h.render()).filter(n=>n.type===h.CompatRecordCard).length,0,'late acknowledgement cannot resurrect stale records');h.unmount();
});

test('running poll is serial, visible-only, bounded, and suppresses stale responses after cleanup',async()=>{
 const h=harness(),seen=[],errors=[],calls=[];let pending=deferred();
 const watch=h.watchCompatRecords(v=>seen.push(v),e=>errors.push(e),{page:h.document,request:(...args)=>{calls.push(args);return pending.promise;}});
 assert.equal(calls.length,1);pending.resolve([{...base,running:true}]);await flush();assert.equal(seen.length,1);
 pending=deferred();const next=h.fire(3000);assert.equal(calls.length,2);assert.equal([...h.timers.values()].filter(t=>t.delay===3000).length,0);
 h.fire(15000);assert.equal(calls[1][2].signal.aborted,true);assert.match(errors[0],/15 秒/);pending.resolve([{...base,message:'late'}]);await next;assert.equal(seen.length,1);
 h.document.change(true);assert.equal(h.timers.size,0);pending=deferred();h.document.change(false);assert.equal(calls.length,3);
 h.document.change(true);assert.equal(calls[2][2].signal.aborted,true);watch.stop();pending.resolve([base]);await flush();assert.equal(seen.length,1);assert.equal(h.document.listeners.size,0);assert.equal(h.timers.size,0);
});

test('refresh invalidates an older read and unmount prevents late action state updates',async()=>{
 const h=harness(),seen=[];let pending=deferred();const watch=h.watchCompatRecords(v=>seen.push(v),assert.fail,{page:h.document,request:()=>pending.promise});watch.refresh();pending.resolve([base]);await flush();assert.equal(seen.length,0);watch.stop();
 const action=deferred();const ui=harness(async method=>method==='compat:prepare'?action.promise:[]);ui.render();await flush();button(ui.render(),'診斷相容來源（不使用 AI）').props.onClick();ui.unmount();const writes=ui.writes;assert.equal(ui.calls.at(-1).signal.aborted,true);action.resolve(base);await flush();assert.equal(ui.writes,writes);assert.equal(ui.calls.filter(c=>c.method==='compat:generate').length,0);
});
