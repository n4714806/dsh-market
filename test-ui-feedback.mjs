import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Tests actual Desktop functions with mocked RPC/state setters, not a visual renderer.
// No network, installs, approvals, dependencies or server required.
const source = readFileSync(new URL(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).exports['./client'].default, import.meta.url), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert(a >= 0 && b > a, `Missing source section ${start}`);
  return source.slice(a, b);
}
const helpers = section('\t\tfunction semanticFeedback(', '\t\t/** 只停止 UI')
  + section('\t\tfunction hasInstalledIdentity(', '\t\tfunction InstalledTab(');
const h = vm.createContext({});
vm.runInContext(helpers, h);
assert.match(h.semanticFeedback({ status: 'used', provider: 'global', model: 'test-model' }), /已使用：global \/ test-model/);
for (const status of ['fallback', 'unavailable']) {
  const text = h.semanticFeedback({ status, provider: 'global', model: 'test-model', reason: 'offline' });
  assert.match(text, /退回一般搜索/);
  assert.match(text, /test-model/);
  assert.match(text, /offline/);
}
assert.match(h.semanticFeedback(), /无法确认/);
assert.match(h.applicationText({ application: 'restart-required' }), /需要重启/);
assert.equal(h.applicationText({ application: 'applied' }), '已生效');
assert.equal(h.warningText({ warnings: ['one', { message: 'two' }] }), 'one；two');
assert.match(h.installStageText({ stage: 'installing', message: 'native wait' }), /等待宿主.*native wait/);
assert.match(h.installStageText({ stage: 'needs-approval' }), /需要确认构建脚本/);
assert.match(h.operationFailure('更新', { error: 'bad', rollback: { attempted: true, ok: true } }), /更新失败.*回復成功/);
assert.match(h.operationFailure('更新', { error: 'bad', rollback: { attempted: true, ok: false, error: 'restore bad' } }), /更新失败.*回復失败.*restore bad/);
assert.match(h.operationFailure('卸载', { rollback: { attempted: false, ok: false } }), /未执行回復/);
console.log('PASS feedback formatters: AI provenance, truthful stages, warnings and rollback');

const searchBody = section('\t\t\tconst runSearch = async', '\t\t\tconst toggleTag');
function searchHarness(respond) {
  const state = {};
  const context = vm.createContext({
    query: 'notes', semanticOn: true, zhCat: '', zhFacets: [], type: 'all', tags: [],
    searchRequestRef: { current: 0 },
    api: respond,
    ...Object.fromEntries(['SemanticNotice', 'SemanticTags', 'Searching', 'Visible', 'Results'].map(k => [
      'set' + k, v => { state[k] = typeof v === 'function' ? v(state[k]) : v; },
    ])),
  });
  vm.runInContext(helpers + searchBody + '\nthis.run = runSearch;', context);
  return { context, state };
}
const plugin = { id: 'notes', name: 'notes', type: 'cordis-plugin', tags: [] };
let methods = [];
let search = searchHarness(async method => {
  methods.push(method);
  return { ai: { status: 'used', provider: 'p', model: 'm' }, tags: ['notes'], results: [{ plugin }] };
});
await search.context.run();
assert.deepEqual(methods, ['search:semantic']);
assert.match(search.state.SemanticNotice, /p \/ m/);
assert.equal(search.state.Results.length, 1);
// Empty AI results are real results, not an invisible second fallback request.
search = searchHarness(async () => ({ ai: { status: 'used', model: 'm' }, tags: [], results: [] }));
await search.context.run();
assert.equal(search.state.Results.length, 0);
assert.match(search.state.SemanticNotice, /已使用/);
methods = [];
search = searchHarness(async method => {
  methods.push(method);
  if (method === 'search:semantic') throw Error('semantic offline');
  return [{ plugin }];
});
await search.context.run();
assert.deepEqual(methods, ['search:semantic', 'search']);
assert.match(search.state.SemanticNotice, /semantic offline.*退回一般搜索/);
assert.equal(search.state.Results.length, 1);
search = searchHarness(async method => { throw Error(method + ' offline'); });
await search.context.run();
assert.match(search.state.SemanticNotice, /AI 搜索失败.*搜索失败：search offline/);
let release;
search = searchHarness(() => new Promise(resolve => { release = resolve; }));
const pendingSearch = search.context.run();
search.context.searchRequestRef.current++;
release({ ai: { status: 'used', model: 'stale' }, results: [{ plugin }] });
await pendingSearch;
assert.equal(search.state.Results, undefined, 'obsolete request must not publish results');
console.log('PASS actual search handler: success, empty, fallback, failures and stale response');

const installedRuntime = {
  mountedRef: { current: true }, checkError: '',
  updateMap: new Proxy({}, { get: () => ({ hasUpdate: true, canUpdate: true, status: 'ok' }) }),
  beginMutation: () => new AbortController(), endMutation() {}, checkNow() {},
};
const updateBody = section('\t\t\tconst updatePlugin = async', '\t\t\t/** Every managed row');
const uninstallBody = section('\t\t\tconst uninstall = async', '\t\t\t/** P0-1 装后四态验证');
for (const action of ['updatePlugin', 'uninstall']) {
  for (const rollbackOk of [true, false]) {
    let changed = 0, notice = '', calls = [];
    const context = vm.createContext({
      ...installedRuntime, updating: null,
      api: async method => { calls.push(method); return { ok: false, applied: false, error: 'native failure', rollback: { attempted: true, ok: rollbackOk, error: 'restore failure' } }; },
      reportOperation: text => { notice = text; },
      onChanged: () => changed++, setUpdating() {}, setOperationNotice() {}, setBusy() {}, setConfirming() {},
      setUpdateMap() { assert.fail('failed update cannot remove update badge'); }, setVerifMap() {},
    });
    vm.runInContext(helpers + (action === 'updatePlugin' ? updateBody : uninstallBody) + `\nthis.run = ${action};`, context);
    await context.run({ pluginId: 'test', localName: 'test' });
    assert.equal(changed, 0);
    assert.equal(calls.length, 1, 'no auto approval, relax or retry');
    assert.match(notice, /失败/);
    assert.match(notice, rollbackOk ? /回復成功/ : /回復失败.*restore failure/);
    assert.doesNotMatch(notice, /更新完成|卸载完成/);
  }
}
for (const action of ['updatePlugin', 'uninstall']) {
  let changed = 0, notice = '';
  const context = vm.createContext({
    ...installedRuntime, updating: null,
    api: async () => ({ ok: true, applied: true, application: 'restart-required', warnings: ['manager warning'] }),
    reportOperation: text => { notice = text; },
    onChanged: () => changed++, setUpdating() {}, setOperationNotice() {}, setBusy() {}, setConfirming() {},
    setUpdateMap() {}, setVerifMap() {},
  });
  vm.runInContext(helpers + (action === 'updatePlugin' ? updateBody : uninstallBody) + `\nthis.run = ${action};`, context);
  await context.run({ pluginId: 'test', localName: 'test' });
  assert.equal(changed, 1);
  assert.match(notice, /完成.*需要重启.*manager warning/);
}
console.log('PASS actual update/removal handlers: rollback success/failure and restart-required success warnings');

// Ambiguous market claims must not prevent exact native inventory management.
const verifyBody = section('\t\t\tconst verifyOne = async', '\t\t\t/** Native manager');
const nativeRow = { localName: '@example/wallpaper', nativeBundle: '@example/wallpaper', pluginId: null, removable: true };
assert.equal(h.hasInstalledIdentity(nativeRow), true);
assert.equal(h.hasInstalledIdentity({ localName: 'legacy-chip' }), false);
assert.equal(h.hasInstalledIdentity({}), false);
assert.equal(h.hasInstalledIdentity({ nativeBundle: '@example/wallpaper', localName: '' }), false);
const inventory = vm.createContext({ installed: [nativeRow, { localName: 'legacy-chip' }] });
vm.runInContext(helpers + section('\t\t\tconst manageable =', '\t\t\treturn El("div", { className: styles_module_css_default.tabBody }, El("div", { className: styles_module_css_default.section }') + '\nthis.managed = manageable; this.legacy = unmatched;', inventory);
assert.equal(inventory.managed[0].nativeBundle, nativeRow.nativeBundle);
assert.equal(inventory.legacy.length, 1);
assert.match(source, /依宿主套件名稱管理／未配對市場/);
for (const [action, body, method] of [
  ['updatePlugin', updateBody, 'update:apply'],
  ['uninstall', uninstallBody, 'uninstall'],
  ['verifyOne', verifyBody, 'verify'],
]) {
  let calls = [], notice = '';
  const context = vm.createContext({
    ...installedRuntime, updating: null, verifying: null,
    api: async (name, args) => { calls.push({ name, args }); return { ok: true, applied: true, state: 'live' }; },
    reportOperation: text => { notice = text; }, toast() {}, activationText: () => 'live',
    onChanged() {}, setUpdating() {}, setOperationNotice() {}, setBusy() {}, setConfirming() {},
    setUpdateMap() {}, setVerifMap() {}, setVerifying() {},
  });
  vm.runInContext(helpers + body + '\nthis.run = ' + action + ';', context);
  await context.run(nativeRow);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, method);
  assert.equal(calls[0].args.localName, nativeRow.localName);
  assert.equal(Object.hasOwn(calls[0].args, 'pluginId'), false, 'never guess a market identity');
  calls = [];
  await context.run({ ...nativeRow, pluginId: 'known-market-id' });
  assert.equal(calls[0].args.localName, nativeRow.localName);
  assert.equal(calls[0].args.pluginId, 'known-market-id');
  calls = [];
  await context.run({});
  await context.run({ localName: 'legacy-chip' });
  assert.equal(calls.length, 0, 'missing trusted identity cannot call mutation or verification APIs');
  if (action !== 'verifyOne') {
    await context.run({ ...nativeRow, removable: false });
    assert.equal(calls.length, 0, 'non-removable native bundles cannot be updated or removed');
    assert.match(notice, /不可移除/);
    await context.run({ localName: '@dsh-market/plugin', nativeBundle: '@dsh-market/plugin', removable: true });
    assert.equal(calls.length, 0, 'market cannot mutate itself');
    assert.match(notice, /内建插件管理器/);
  }
}
console.log('PASS native inventory management: exact localName, optional market ID, guards and self-management restrictions');

const startBody = section('\t\t\tconst startAi = async', '\t\t\t/** #165 建议二');
for (const success of [true, false]) {
  const state = {};
  let resolveInstall, stops = 0, watcher;
  const methods = [];
  const context = vm.createContext({
    plugin: { id: 'test', name: 'test' }, security: false,
    parentSessionId: '', modalController: { current: new AbortController() },
    lastInstallIdRef: { current: '' }, initialWatchStopRef: { current: null }, t1WatchStopRef: { current: null },
    PENDING_INSTALL_KEY: 'pending', localStorage: { setItem() {}, removeItem() {} },
    RpcError: class extends Error { constructor(message, classified) { super(message); this.classified = classified; } },
    watchInstallStatus(id, done, error, progress, options) { watcher = { id, done, error, progress, options }; return () => stops++; },
    api(method) { methods.push(method); return new Promise(resolve => { resolveInstall = resolve; }); },
    ...Object.fromEntries(['Phase', 'Error', 'T0', 'T1Result', 'ChildSessionId', 'InstallProgress', 'ErrorClass', 'DiagCopied'].map(k => [
      'set' + k, v => { state[k] = v; },
    ])),
  });
  vm.runInContext(helpers + startBody + '\nthis.run = startAi;', context);
  const pending = context.run();
  assert.equal(state.Phase, 'running');
  assert.equal(watcher.options.allowUnknown, true);
  assert.equal(watcher.options.preservePending, true);
  watcher.progress({ stage: 'installing', message: 'manager waiting' });
  assert.match(state.InstallProgress, /manager waiting/);
  watcher.error('状态查询超时，未取消后台安装');
  assert.equal(state.Phase, 'running', 'status timeout does not cancel or retry original installation');
  resolveInstall(success
    ? { ok: true, mode: 'native', application: 'restart-required', warnings: ['native warning'] }
    : { ok: false, mode: 'native', error: 'native error', warnings: ['native warning'] });
  await pending;
  assert.deepEqual(methods, ['ai:install']);
  assert.equal(stops, 1);
  assert.equal(state.Phase, success ? 'handedOff' : 'error');
  if (success) {
    assert.equal(state.T0.application, 'restart-required');
    assert.equal(state.T0.warnings[0], 'native warning');
  } else assert.match(state.Error, /native error.*native warning/);
}
assert.match(source, /warningText\(t0\) \? El\("p"/);
assert.match(source, /applicationText\(t0\)/);
console.log('PASS actual native start handler: stage observation, timeout non-cancellation, warnings and errors');

// Exercise real bounded status observer with its initial-RPC options and fake timers.
const pollBody = section('\t\tfunction watchInstallStatus(', '\t\tconst GH_LOGIN_KEY');
let pollResult = { known: false }, progress, error, calls = 0, removed = false, nextId = 0;
const timers = new Map();
const polling = vm.createContext({
  AbortController, PENDING_INSTALL_KEY: 'pending',
  localStorage: { getItem: () => '{"installId":"test"}', removeItem: () => { removed = true; } },
  setTimeout(fn, ms) { const id = ++nextId; timers.set(id, { fn, ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
  api: async method => { assert.equal(method, 'ai:install:status'); calls++; return pollResult; },
});
vm.runInContext(pollBody + '\nthis.watch = watchInstallStatus;', polling);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const stop = polling.watch('test', () => {}, message => { error = message; }, value => { progress = value; }, { allowUnknown: true, preservePending: true });
await flush();
assert.equal(error, undefined);
pollResult = { known: true, running: true, stage: 'installing', message: 'native' };
const retry = [...timers].find(([, t]) => t.ms === 3000);
timers.delete(retry[0]); retry[1].fn(); await flush();
assert.equal(progress.stage, 'installing');
assert.equal(calls, 2);
const deadline = [...timers].find(([, t]) => t.ms === 600000);
timers.delete(deadline[0]); deadline[1].fn(); await flush();
assert.match(error, /未取消后台安装/);
assert.equal(removed, false);
assert.equal(timers.size, 0);
stop();
console.log('PASS actual initial status observer: unknown-start race, progress, bounded timeout, pending preservation');
console.log('All Desktop UI feedback tests passed. No live UI/render verification or installation performed.');
