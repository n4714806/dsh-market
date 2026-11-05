import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the actual Desktop bundle helper without loading React or making requests.
const source = readFileSync(new URL('./lib/client-optimized-v2.js', import.meta.url), 'utf8');
const start = source.indexOf('\t\tfunction watchInstallStatus(');
const end = source.indexOf('\t\tconst GH_LOGIN_KEY', start);
assert(start >= 0 && end > start, 'Desktop polling helper must exist');
const helper = source.slice(start, end);
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

async function test(name, respond, action, expected, check = () => {}) {
  let pending = JSON.stringify({ installId: 'test' });
  let result, error, calls = 0, callbacks = 0, nextTimer = 0;
  const timers = new Map();
  const controller = new AbortController();
  const context = vm.createContext({
    AbortController: class { constructor() { return controller; } },
    PENDING_INSTALL_KEY: 'pending',
    localStorage: {
      getItem(key) { assert.equal(key, 'pending'); return pending; },
      removeItem(key) { assert.equal(key, 'pending'); pending = null; },
    },
    api(method, args, opts) {
      // Any installation/cancellation RPC is a test failure.
      assert.equal(method, 'ai:install:status');
      assert.equal(args.installId, 'test');
      assert.equal(opts.signal, controller.signal);
      calls++;
      return respond();
    },
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  vm.runInContext(`${helper}\nthis.watch = watchInstallStatus;`, context);
  const stop = context.watch('test', value => { callbacks++; result = value; }, value => { callbacks++; error = value; });
  await flush();
  const fire = async ms => {
    const timer = [...timers].find(([, value]) => value.ms === ms);
    assert(timer, `${name}: expected ${ms}ms timer`);
    timers.delete(timer[0]);
    timer[1].fn();
    await flush();
  };
  if (action === 'deadline') await fire(600000);
  if (action === 'retries') {
    for (let i = 1; i < 200; i++) await fire(3000);
    assert.equal(calls, 200);
  }
  if (action === 'stop') stop();
  if (expected === 'error') {
    assert.equal(typeof error, 'string', name);
    assert.match(error, /无法确认安装结果/);
    assert.match(error, /未取消后台安装/);
    assert.equal(result, undefined);
    assert.equal(pending, null);
    assert.equal(callbacks, 1);
  } else if (expected === 'ok') {
    assert.equal(result.ok, true);
    assert.equal(error, undefined);
    assert.equal(pending, null);
    assert.equal(callbacks, 1);
  }
  assert(controller.signal.aborted, `${name}: stop status request`);
  assert.equal(timers.size, 0, `${name}: clear timers`);
  check({ pending, error, result, calls, callbacks });
  console.log(`PASS ${name}`);
}

await test('explicit success', async () => ({ known: true, running: false, ok: true }), null, 'ok');
await test('unknown task', async () => ({ known: false, running: false }), null, 'error');
await test('malformed status', async () => ({}), null, 'error');
await test('running deadline', async () => ({ running: true }), 'deadline', 'error');
await test('hung request deadline', () => new Promise(() => {}), 'deadline', 'error');
await test('200 query failures', async () => { throw Error('offline'); }, 'retries', 'error', ({ error }) => assert.match(error, /offline/));
await test('unmount preserves pending', () => new Promise(() => {}), 'stop', null, ({ pending, error, callbacks }) => {
  assert(pending);
  assert.equal(error, undefined);
  assert.equal(callbacks, 0);
});
console.log('All 7 Desktop polling tests passed (mock API and timers; no installation performed).');
