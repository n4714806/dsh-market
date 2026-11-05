import test from 'node:test';
import assert from 'node:assert/strict';
import { lookupSourceVersion, lookupBundleVersion, extractNpmPackage, canonicalGithubRepo, compareSourceVersions } from './lib/source-versions.js';
const plugin = (command = 'dsh plugin --profile home add @scope/pkg@latest') => ({ install: { commands: [command], target: 'home' } });
const json = (data, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: new Headers(headers), json: async () => data });

test('exact identity: scopes, aliases, profile positions; reject runners, compounds and ambiguity', () => {
  assert.equal(extractNpmPackage(plugin()), '@scope/pkg');
  assert.equal(extractNpmPackage(plugin('dsh --profile home plugin add alias@npm:@real/pkg@1.0.0')), '@real/pkg');
  for (const command of ['npx skills add owner/repo', 'npx dsh plugin add pkg', 'npm install pkg && echo x', 'npm install pkg;echo x', 'npm install pkg | x', 'npm install pkg\nwhoami', 'npm install --global pkg', 'npm install pkg other', 'dsh plugin --profile home add', 'npm install https://example.com/a.tgz', 'npm install owner/repo', 'npm install "pkg', 'npm install $(whoami)']) assert.equal(extractNpmPackage(plugin(command)), null, command);
  assert.equal(extractNpmPackage({ name: 'pkg', install: { target: 'home' } }), null);
  assert.equal(extractNpmPackage({ install: { commands: ['npm install pkg', 'npm install pkg'] } }), null);
});
test('canonical repo rejects URLs with wrong host, paths or suffixes', () => {
  assert.equal(canonicalGithubRepo('https://github.com/Owner/Repo.git'), 'owner/repo');
  for (const value of ['https://evil.com/owner/repo', 'https://github.com.evil.com/owner/repo', 'owner/repo/tree/main', 'owner/repo?x=1', 'owner/..']) assert.equal(canonicalGithubRepo(value), null);
});
test('registry namespace, dist tag not top-level version, independent github', async () => {
  const urls = [];
  const fetchImpl = async (url, opts) => { urls.push(url); assert.equal(opts.cache, 'no-store'); assert.equal(opts.redirect, 'manual'); assert.equal(opts.headers.Authorization, undefined); return json(url.includes('api.github') ? { tag_name: 'v9.0.0', target_commitish: 'main' } : { version: '99.0.0', 'dist-tags': { latest: '2.0.0' } }); };
  const result = await lookupSourceVersion({ ...plugin(), fullName: 'owner/repo' }, { fetchImpl, registry: 'https://mirror.example/npm/' });
  assert.deepEqual(urls.sort(), ['https://api.github.com/repos/owner/repo/releases/latest', 'https://mirror.example/npm/%40scope%2Fpkg'].sort());
  assert.equal(result.primarySource, 'npm'); assert.equal(result.npm.version, '2.0.0'); assert.equal(result.github.version, '9.0.0'); assert.equal(result.github.commit, null);
});
test('moved repository follows same-origin 301 and reports resolved URL', async () => {
  const urls = [], signals = [];
  const target = 'https://api.github.com/repos/dsh-market/dsh-market/releases/latest';
  const fetchImpl = async (url, opts) => {
    urls.push(url); signals.push(opts.signal); assert.equal(opts.redirect, 'manual');
    return urls.length === 1 ? json({}, 301, { location: target }) : json({ tag_name: 'v1.2.3' });
  };
  const r = await lookupSourceVersion({ fullName: '2BingLing/dsh-market' }, { fetchImpl });
  assert.equal(r.github.status, 'ok'); assert.equal(r.github.sourceURL, target); assert.equal(urls.length, 2); assert.equal(signals[0], signals[1]);
});
test('redirects reject cross-origin, credentials, protocol changes and missing location', async () => {
  for (const location of ['https://evil.example/steal', '//evil.example/steal', 'https://user:secret@api.github.com/repos/a/b', 'http://api.github.com/repos/a/b', 'file:///tmp/test', '']) {
    let calls = 0;
    const r = await lookupSourceVersion({ fullName: 'owner/repo' }, { fetchImpl: async () => { calls++; return json({}, 301, { location }); } });
    assert.equal(calls, 1); assert.equal(r.github.reason, 'unsafe-or-invalid-redirect'); assert.ok(!JSON.stringify(r).includes('secret'));
  }
});
test('three redirects allowed, fourth rejected; body shares original deadline', async () => {
  for (const redirects of [3, 4]) {
    let calls = 0;
    const r = await lookupSourceVersion({ fullName: 'owner/repo' }, { fetchImpl: async () => ++calls <= redirects ? json({}, 302, { location: `/repos/owner/repo/releases/latest?hop=${calls}` }) : json({ tag_name: 'v1.0.0' }) });
    assert.equal(calls, 4); assert.equal(r.github.status, redirects === 3 ? 'ok' : 'error');
    if (redirects === 4) assert.equal(r.github.reason, 'redirect-limit');
  }
  let calls = 0;
  const r = await lookupSourceVersion({ fullName: 'owner/repo' }, { timeoutMs: 10, fetchImpl: async () => ++calls === 1 ? json({}, 307, { location: '/moved' }) : ({ ok: true, status: 200, json: () => new Promise(() => {}) }) });
  assert.equal(calls, 2); assert.equal(r.github.reason, 'timeout');
});
test('fresh cache, force bypass, parallel dedup, mutation isolation', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return json({ 'dist-tags': { latest: `${calls}.0.0` } }); };
  const first = await lookupSourceVersion(plugin(), { fetchImpl }); first.npm.version = 'corrupted';
  assert.equal((await lookupSourceVersion(plugin(), { fetchImpl })).npm.version, '1.0.0');
  assert.equal((await lookupSourceVersion(plugin(), { fetchImpl })).npm.cached, true);
  const forced = await Promise.all(Array.from({ length: 5 }, () => lookupSourceVersion(plugin(), { fetchImpl, force: true })));
  assert.equal(calls, 2); assert.ok(forced.every(x => x.npm.version === '2.0.0' && !x.npm.cached));
});
test('cache expires at five minutes and registries have separate identities', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return json({ 'dist-tags': { latest: '1.0.0' } }); };
  const realNow = Date.now; let clock = realNow(); Date.now = () => clock;
  try {
    await lookupSourceVersion(plugin(), { fetchImpl }); clock += 299_999;
    assert.equal((await lookupSourceVersion(plugin(), { fetchImpl })).npm.cached, true);
    clock += 1;
    assert.equal((await lookupSourceVersion(plugin(), { fetchImpl })).npm.cached, false);
    await lookupSourceVersion(plugin(), { fetchImpl, registry: 'https://mirror.example' });
    assert.equal(calls, 3);
  } finally { Date.now = realNow; }
});
test('failure retains last good explicitly stale, never falls back to release', async () => {
  let fail = false;
  const fetchImpl = async url => url.includes('api.github') ? json({ tag_name: 'v9.0.0' }) : fail ? json({}, 500) : json({ 'dist-tags': { latest: '1.0.0' } });
  const p = { ...plugin(), fullName: 'owner/repo' };
  await lookupSourceVersion(p, { fetchImpl }); fail = true;
  const r = await lookupSourceVersion(p, { fetchImpl, force: true });
  assert.equal(r.npm.status, 'error'); assert.equal(r.npm.version, '1.0.0'); assert.equal(r.npm.stale, true); assert.ok(r.npm.lastGoodAt); assert.equal(r.github.version, '9.0.0');
});
test('403 rate-limit evidence vs actual permission error, 429, 404', async () => {
  for (const [status, headers, expected] of [[403, { 'retry-after': '60' }, 'rate-limited'], [403, { 'x-ratelimit-remaining': '0' }, 'rate-limited'], [403, {}, 'error'], [403, { 'x-ratelimit-remaining': '59', 'x-ratelimit-reset': '2000000000' }, 'error'], [429, {}, 'rate-limited'], [404, {}, 'unavailable']]) {
    const r = await lookupSourceVersion(plugin(), { fetchImpl: async () => json({}, status, headers) });
    assert.equal(r.npm.status, expected); assert.equal(r.npm.version, null); assert.equal(r.npm.httpStatus, status);
    if (headers['retry-after']) assert.ok(Date.parse(r.npm.retryAfter) > Date.now());
  }
});
test('timeout covers fetch and body even if adapter ignores AbortSignal', async () => {
  for (const fetchImpl of [async () => new Promise(() => {}), async () => ({ ok: true, json: () => new Promise(() => {}) })]) {
    const start = Date.now(); const r = await lookupSourceVersion(plugin(), { fetchImpl, timeoutMs: 10 });
    assert.equal(r.npm.reason, 'timeout'); assert.equal(r.npm.status, 'error'); assert.ok(Date.now() - start < 1000);
  }
});
test('invalid JSON, network exceptions and missing dist-tag cannot be up-to-date', async () => {
  for (const fetchImpl of [async () => { throw Error('secret'); }, async () => ({ ok: true, json: async () => { throw Error('secret'); } }), async () => json({ version: '1.0.0' })]) {
    const r = await lookupSourceVersion(plugin(), { fetchImpl }); assert.notEqual(r.npm.status, 'ok'); assert.equal(r.npm.version, null); assert.ok(!JSON.stringify(r).includes('secret'));
  }
});
test('release absence/non-semver/draft/prerelease never guesses tags or commits', async () => {
  for (const data of [{}, { tag_name: 'release-2026' }, { tag_name: 'v1.0.0', draft: true }, { tag_name: 'v1.0.0-beta.1', prerelease: true }]) {
    let calls = 0; const r = await lookupSourceVersion({ fullName: 'owner/repo' }, { fetchImpl: async () => { calls++; return json(data); } });
    assert.equal(r.github.status, 'unavailable'); assert.equal(r.github.version, null); assert.equal(r.github.commit, null); assert.equal(calls, 1);
  }
});
test('registry credentials and conflicting repository identities do not make requests', async () => {
  let calls = 0; const r = await lookupSourceVersion({ ...plugin(), fullName: 'owner/one', id: 'owner/two' }, { registry: 'https://user:secret@example.com', fetchImpl: async () => { calls++; } });
  assert.equal(calls, 0); assert.equal(r.npm.status, 'unsupported'); assert.equal(r.github.status, 'unsupported'); assert.ok(!JSON.stringify(r).includes('secret'));
});
test('strict semver, numeric prerelease, build metadata and no lexical fallback', () => {
  for (const [a, b, result] of [['1.10.0', '1.9.0', 1], ['1.0.0-beta.10', '1.0.0-beta.2', 1], ['1.0.0-1', '1.0.0-a', -1], ['1.0.0', '1.0.0-rc.1', 1], ['v1.0.0+a', '1.0.0+b', 0], ['1.0.0-01', '1.0.0', null], ['01.0.0', '1.0.0', null], ['main', 'latest', null], ['9007199254740993.0.0', '9007199254740992.0.0', 1]]) assert.equal(compareSourceVersions(a, b), result, `${a} / ${b}`);
});
test('native bundles require registry source evidence; git and local never query npm', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return json({ 'dist-tags': { latest: '3.0.0' } }); };
  for (const source of ['file:../pkg', 'https://github.com/owner/repo.git', 'github:owner/repo', 'C:\\pkg', '', 'other@1.0.0']) {
    const r = await lookupBundleVersion({ name: '@scope/pkg', source }, { fetchImpl }); assert.equal(r.npm.status, 'unsupported');
  }
  assert.equal(calls, 0);
  assert.equal((await lookupBundleVersion({ name: '@scope/pkg', source: '@scope/pkg@1.0.0' }, { fetchImpl })).npm.version, '3.0.0');
  assert.equal((await lookupBundleVersion({ name: 'alias', source: 'alias@npm:@real/pkg@latest' }, { fetchImpl })).npm.packageName, '@real/pkg');
});
test('cache bounded to 500 entries with oldest eviction', async () => {
  let calls = 0; const fetchImpl = async () => { calls++; return json({ 'dist-tags': { latest: '1.0.0' } }); };
  for (let i = 0; i <= 500; i++) await lookupSourceVersion(plugin(`npm install package-${i}`), { fetchImpl });
  assert.equal(calls, 501);
  await lookupSourceVersion(plugin('npm install package-0'), { fetchImpl }); assert.equal(calls, 502);
});
