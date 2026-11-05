import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchBundleToPlugin, managedInstalled } from './lib/managed-inventory.js';

const market = (id, spec, extra = {}) => ({
  id, fullName: id, name: 'plugin', type: 'cordis-plugin',
  install: { target: 'desktop', commands: spec ? [`dsh plugin --profile desktop add ${spec}`] : [] }, ...extra,
});
const bundle = (name, source = '^1.0.0', extra = {}) => ({
  name, source, version: '1.2.3', installed: true, availability: 'profile',
  enabled: true, removable: true, official: false, rows: [], overrides: [], ...extra,
});
const own = market('market-owner/market', '@dsh-market/plugin@latest');
const remote = market('remote-owner/remote', '@dsh-remote/plugin');

test('scoped package collisions never use generic plugin.name or scope-stripped name', () => {
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [remote, own]), own);
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [remote]), null);
  assert.equal(matchBundleToPlugin(bundle('@unknown/plugin'), [own, remote]), null);
  assert.equal(matchBundleToPlugin(bundle('plugin'), [own, remote]), null);
  assert.equal(matchBundleToPlugin(bundle('desktop'), [own]), null);
});

test('registry commands support exact names, versions, quoted specs and aliases', () => {
  for (const command of [
    'npm install "@dsh-market/plugin@^1.0.0"',
    "pnpm add '@dsh-market/plugin@next'",
    'dsh plugin add local-alias@npm:@dsh-market/plugin@~1.0.0',
  ]) {
    const p = market('market-owner/market', null, { install: { commands: [command] } });
    assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [p]), p);
  }
  assert.equal(matchBundleToPlugin(bundle('local-alias', 'npm:@dsh-market/plugin@^1'), [own, remote]), own);
  assert.equal(matchBundleToPlugin(bundle('@dsh-remote/plugin', 'npm:@dsh-market/plugin@latest'), [own, remote]), own);
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin', '@dsh-remote/plugin@1'), [own, remote]), null);
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin', 'npm:bad/path/invalid'), [own]), null);
});

test('canonical GitHub identity accepts git suffixes, transport variants and refs', () => {
  const p = market('Owner/Repository', null);
  for (const source of [
    'github:OWNER/Repository.git#main', 'owner/repository#v1',
    'https://github.com/Owner/Repository.git#feature/branch',
    'git+https://github.com/owner/repository.git#semver:^1.0.0',
    'git@github.com:owner/repository.git',
    'git+ssh://git@github.com/owner/repository.git#deadbeef',
  ]) assert.equal(matchBundleToPlugin(bundle('@local/alias', source), [p]), p, source);
  for (const source of ['https://github.com.evil/owner/repository',
    'https://github.com/owner/repository/tree/main', 'file:owner/repository',
    'https://example.com/owner/repository', 'https://github.com/owner/repository?x=1']) {
    assert.equal(matchBundleToPlugin(bundle('@local/alias', source), [p]), null, source);
  }
  const withCommand = market('owner/repository', 'github:Owner/Repository.git#main');
  assert.equal(matchBundleToPlugin(bundle('alias', 'github:owner/repository#v2'), [withCommand]), withCommand);
});

test('conflicting claims and duplicate candidates never select by order', () => {
  const duplicate = market('another/repository', '@dsh-market/plugin');
  for (const candidates of [[own, duplicate], [duplicate, own]]) {
    assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), candidates), null);
  }
  const conflicting = market('market-owner/market', null, { install: {
    commands: ['dsh plugin add @dsh-market/plugin', 'dsh plugin add @other/plugin'],
  } });
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [conflicting]), null);
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [own, conflicting]), null);
  assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin', 'github:remote-owner/remote'), [own, remote]), null);
  const conflictingRepo = market('one/repo', 'github:two/repo');
  assert.equal(matchBundleToPlugin(bundle('alias', 'github:one/repo'), [conflictingRepo]), null);
});

test('does not interpret shell compounds, flags, display names or profile targets as claims', () => {
  for (const command of ['echo @dsh-market/plugin', 'dsh plugin add @dsh-market/plugin && echo ok',
    'npm install --global @dsh-market/plugin', 'dsh plugin add "$PACKAGE"']) {
    const p = market('owner/repo', null, { install: { commands: [command] }, name: '@dsh-market/plugin' });
    assert.equal(matchBundleToPlugin(bundle('@dsh-market/plugin'), [p]), null);
  }
});

test('only manager installed/profile rows, including disabled and unknown, plus legacy skills survive', async () => {
  const disabled = bundle('@dsh-market/plugin', '^9', { enabled: false, version: '9.2.1' });
  const unknown = bundle('@unknown/plugin', 'file:../unknown', { version: undefined });
  const rows = [disabled, unknown,
    bundle('@dsh-remote/plugin', '^1', { availability: 'installation' }),
    bundle('@dsh-remote/plugin', '^1', { installed: false }),
    bundle('@dsh-remote/plugin', '^1', { availability: 'missing' })];
  const skill = { pluginId: 'owner/skill', localName: 'skill', source: 'skills', version: null, plugin: { type: 'skill' } };
  let calls = 0;
  const manager = { async listBundles() { assert.equal(this, manager); calls++; return rows; } };
  const ctx = { get(key) { assert.equal(key, 'pluginManager'); return manager; } };
  const result = await managedInstalled(ctx, [own, remote], {
    legacySkills: [skill, { ...skill, source: 'profile', plugin: remote }],
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, [
    { pluginId: own.id, localName: disabled.name, version: '9.2.1', source: 'profile', plugin: own, nativeBundle: disabled.name, enabled: false, removable: true },
    { pluginId: null, localName: unknown.name, version: null, source: 'profile', plugin: null, nativeBundle: unknown.name, enabled: true, removable: true }, skill,
  ]);
  assert.equal(matchBundleToPlugin(disabled, [{ ...own, type: 'skill' }]), null);
  assert.deepEqual(await managedInstalled({ get: () => ({ listBundles: async () => [] }) }, [own]), []);
});

test('missing optional API and failures are explicit; never invoke mutation APIs', async () => {
  for (const ctx of [undefined, {}, { get: () => undefined }, { get: () => ({}) }]) {
    await assert.rejects(managedInstalled(ctx, []), /pluginManager.listBundles/);
  }
  await assert.rejects(managedInstalled({ get: () => ({ listBundles: async () => ({ bundles: [] }) }) }, []), /BundleInfo/);
  const manager = new Proxy({ listBundles: async () => { throw new Error('read failed'); } }, {
    get(target, key) { assert.equal(key, 'listBundles'); return target[key]; },
  });
  await assert.rejects(managedInstalled({ get: () => manager }, []), /read failed/);
});
