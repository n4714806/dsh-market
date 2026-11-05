import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = fs.readFileSync(new URL('./lib/client-tasks.js', import.meta.url), 'utf8');
function harness() {
  let exported, seq = 0;
  const timers = new Map(), effects = [], states = [];
  const page = { hidden: false, listeners: new Set(), querySelector: () => ({}), addEventListener(_, cb) { this.listeners.add(cb); }, removeEventListener(_, cb) { this.listeners.delete(cb); }, change(hidden) { this.hidden = hidden; for (const cb of this.listeners) cb(); } };
  const react = { Component: class {}, createElement: (type, props, ...children) => ({ type, props: props || {}, children }), useState: initial => [typeof initial === 'function' ? initial() : initial, value => states.push(value)], useRef: value => ({ current: value }), useEffect: effect => effects.push(effect), useSyncExternalStore: () => true };
  const context = { console, AbortController, document: page, localStorage: { getItem: () => null }, setTimeout: (fn, delay) => { timers.set(++seq, { fn, delay }); return seq; }, clearTimeout: id => timers.delete(id), window: { __ModuleLoader__: { load: ({ factory }) => { exported = factory(() => react); } } } };
  vm.runInNewContext(source.replace('exports.apply = apply;', 'exports.testing = { watchTasks, cancellationFeedback, taskDiagnostic, TaskCard, TasksTab, MarketPanel, InstallModal, hasInstalledIdentity, installedOperationArgs, installedMutationRestriction }; exports.apply = apply;'), context);
  return { ...exported.testing, page, timers, effects, states, next() { const [id, timer] = timers.entries().next().value; timers.delete(id); assert.equal(timer.delay, 3000); return timer.fn(); } };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const walk = node => !node || typeof node !== 'object' ? [] : [node, ...(node.children || []).flatMap(walk)];
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join(' ');

test('polls serially, reports errors, retains data, and stops on unmount', async () => {
  const h = harness(), seen = [], errors = [], calls = [];
  let pending = deferred();
  const stop = h.watchTasks((...args) => seen.push(args), error => errors.push(error), { page:h.page, request: (...args) => { calls.push(args); return pending.promise; } });
  assert.equal(calls.length, 1); assert.equal(h.timers.size, 1); // request deadline only
  pending.resolve({tasks:[{id:'a'}]}); await flush(); assert.equal(seen.length,1); assert.equal(h.timers.size,1);
  pending = deferred(); const second = h.next(); assert.equal(calls.length,2); assert.equal(h.timers.size,1); // request deadline, not another poll
  pending.reject(new Error('offline')); await second; assert.deepEqual(errors,['offline']); assert.equal(seen.length,1);
  pending = deferred(); const third = h.next(); stop(); assert.equal(calls[2][2].signal.aborted,true); assert.equal(h.page.listeners.size,0);
  pending.resolve({tasks:[{id:'stale'}]}); await third; assert.equal(seen.length,1); assert.equal(h.timers.size,0);
});
test('hidden pages abort active reads and suppress stale responses without overlap', async () => {
  const h=harness(), seen=[], calls=[]; let pending=deferred();
  const stop=h.watchTasks(v=>seen.push(v), assert.fail, {page:h.page, request:(...args)=>{calls.push(args);return pending.promise;}});
  h.page.change(true); assert.equal(calls[0][2].signal.aborted,true);
  h.page.change(false); assert.equal(calls.length,1);
  pending.resolve({tasks:[{id:'stale'}]}); await flush(); assert.equal(seen.length,0);
  pending=deferred(); const next=h.next(); assert.equal(calls.length,2);
  pending.resolve({tasks:[]}); await next; assert.equal(seen.length,1);
  h.page.change(true); assert.equal(h.timers.size,0); stop();
});
test('hung HTTP has a 15 second deadline, retains last data, and never overlaps', async () => {
 const h=harness(), seen=[], errors=[], calls=[]; let pending=deferred();
 const stop=h.watchTasks(v=>seen.push(v),e=>errors.push(e),{page:h.page,request:(...args)=>{calls.push(args);return pending.promise;}});
 pending.resolve({tasks:[{id:'last-known'}]}); await flush();
 pending=deferred(); const hung=h.next();
 const [id, deadline]=h.timers.entries().next().value;
 assert.equal(deadline.delay,15000); h.timers.delete(id); deadline.fn();
 assert.equal(calls[1][2].signal.aborted,true); assert.match(errors[0],/逾時（15 秒）/);
 assert.equal(seen.length,1); assert.equal(seen[0][0].id,'last-known'); assert.equal(h.timers.size,0);
 h.page.change(false); assert.equal(calls.length,2); // ignored abort cannot create overlap
 pending.resolve({tasks:[{id:'late'}]}); await hung; assert.equal(seen.length,1);
 pending=deferred(); const active=h.next(); assert.equal(calls.length,3);
 h.page.change(true); assert.equal(h.timers.size,0); assert.equal(calls[2][2].signal.aborted,true);
 stop(); pending.reject(new Error('aborted')); await active; assert.equal(errors.length,1); assert.equal(h.timers.size,0);
});
test('accepted cancellation is independent from failed installation outcome in both callers', () => {
 const h=harness();
 const accepted={accepted:true,ok:false,status:'needs-attention'};
 assert.match(h.cancellationFeedback(accepted),/已送出取消請求/);
 assert.doesNotMatch(h.cancellationFeedback(accepted),/失敗/);
 assert.match(h.cancellationFeedback({accepted:false,ok:false,status:'failed'}),/已結束或無可取消工作/);
 assert.match(h.cancellationFeedback({ok:true}),/未確認/);
 assert.match(source,/setFeedback\(cancellationFeedback\(result\)\)/);
 assert.match(source,/setInstallProgress\(cancellationFeedback\(result\)\)/);
});
test('malformed responses are visible query errors', async () => {
 const h=harness(), errors=[]; const stop=h.watchTasks(assert.fail,e=>errors.push(e),{page:h.page,request:async()=>({})}); await flush(); assert.match(errors[0],/格式/); stop();
});
test('task cards show terminal states, full child id, timeline and cautious cancellation', () => {
 const h=harness();
 for (const status of ['running','succeeded','failed','cancelled','interrupted','needs-attention']) {
   const tree=h.TaskCard({task:{id:'task-a',pluginName:'Plugin',profile:'web',kind:'review',status,running:status==='running',stage:'inspection',message:'Waiting',createdAt:1,updatedAt:2,childSessionId:'full-session-id-123456789',error:status==='failed'?'failed reason':undefined,events:[{at:1,stage:'created',message:'recorded'}]}});
   assert.match(text(tree),/full-session-id-123456789/); assert.match(text(tree),/recorded/);
   assert.equal(walk(tree).some(n=>n.type==='button'&&text(n)==='取消任務'),status==='running');
   if(status==='interrupted') assert.match(text(tree),/不會自動重試/);
 }
 assert.match(text(h.TaskCard({task:{id:'x',status:'needs-attention',events:[]}})),/尚無已確認的子會話/);
});
test('safe diagnostics omit free text and arbitrary fields', () => {
 const h=harness(); const diagnostic=JSON.parse(h.taskDiagnostic({id:'x',status:'failed',error:'SECRET',message:'SECRET',commands:['SECRET'],environment:{token:'SECRET'},events:[{message:'SECRET'}],running:false}));
 assert.equal(diagnostic.hasError,true); assert.equal(JSON.stringify(diagnostic).includes('SECRET'),false);
});
test('native null-id identity remains manageable without invented market id', () => {
 const h=harness(), item={pluginId:null,localName:'@native/bundle',nativeBundle:'@native/bundle'};
 assert.equal(h.hasInstalledIdentity(item),true); assert.equal(JSON.stringify(h.installedOperationArgs(item)),JSON.stringify({localName:'@native/bundle'})); assert.equal(h.installedMutationRestriction(item),'');
 assert.match(h.installedMutationRestriction({...item,removable:false}),/不可移除/);
});
test('market task entry survives catalog errors and modal explicitly selects parent', () => {
 const h=harness(), tree=h.MarketPanel({mode:'main',onClose(){}});
 assert.ok(walk(tree).some(n=>n.type==='button'&&text(n)==='安裝任務'));
 const modal=h.InstallModal({plugin:{id:'x',name:'X'},onViewTasks(){}});
 assert.ok(walk(modal).some(n=>n.type==='button'&&text(n)==='檢視安裝任務'));
 const select=walk(modal).find(n=>n.type==='select'); assert.equal(select.props.value,'');
 assert.match(source,/tab === "tasks" \? El\(Boundary[^\n]+ : loadError/);
 assert.doesNotMatch(source,/AI 助手正在诊断安装命令|宿主将代为执行|api\("update:self"/);
 assert.match(source,/parentSessionId: parentSessionId \|\| undefined/);
 assert.ok(source.includes('https://github.com/n4714806/dsh-market/tags'), 'fork version listing is available');
});
