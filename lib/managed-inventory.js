// Read-only inventory adapter. Contract inspected from Host Service.pluginManager.
// install.target is a profile name / skills directory, NOT package identity.
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

function registryIdentity(value) {
  if (typeof value !== 'string') return null;
  let spec = value.trim();
  // npm aliases identify their real package, never the dependency alias.
  const alias = spec.indexOf('npm:');
  if (alias >= 0) {
    if (alias && !PACKAGE.test(spec.slice(0, alias - 1))) return null;
    if (alias && spec[alias - 1] !== '@') return null;
    spec = spec.slice(alias + 4);
  }
  const match = spec.match(/^(@[^/]+\/[^@]+|[^@]+)(?:@([^\s]+))?$/);
  if (!match || !PACKAGE.test(match[1])) return null;
  if (match[2] && !/^[a-zA-Z0-9*^~<>=|.+_-]+$/.test(match[2])) return null;
  return match[1];
}

function githubIdentity(value) {
  if (typeof value !== 'string') return null;
  let spec = value.trim().replace(/^git\+/, '');
  spec = spec.replace(/^github:/i, '').replace(/^git@github\.com:/i, '')
    .replace(/^(?:https?|git|ssh):\/\/(?:git@)?github\.com\//i, '');
  // Only owner/repo, with an optional git ref: no subdirectories, query URLs,
  // lookalike hosts, tree URLs, local paths, or decoded/guessed identities.
  const match = spec.match(/^([a-z0-9][a-z0-9-]*)\/([a-z0-9_.-]+?)(?:\.git)?\/?(?:#[^\s?#]+)?$/i);
  if (!match || match[2] === '.' || match[2] === '..') return null;
  return `${match[1]}/${match[2]}`.toLowerCase();
}

function commandSpecs(command) {
  if (typeof command !== 'string' || /[\r\n;&|`$<>]/.test(command)) return [];
  const tokens = command.trim().match(/"[^"\r\n]*"|'[^'\r\n]*'|[^\s]+/g) ?? [];
  const words = tokens.map((s) => /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);
  let rest;
  if (words[0] === 'dsh' && words[1] === 'plugin') {
    let i = 2;
    if (words[i] === '--profile' && words[i + 1]) i += 2;
    if (words[i] !== 'add') return [];
    rest = words.slice(i + 1);
  } else if ((words[0] === 'npm' && ['install', 'i'].includes(words[1])) ||
             (words[0] === 'pnpm' && words[1] === 'add')) {
    rest = words.slice(2);
  } else return [];
  // Unknown flags/compound commands are deliberately not interpreted.
  return rest.length && rest.every((s) => !s.startsWith('-') && !/[\s"']/.test(s)) ? rest : [];
}

function pluginClaims(plugin) {
  const packages = new Set();
  const repos = new Set();
  for (const value of [plugin.id, plugin.fullName]) {
    const repo = githubIdentity(value);
    if (repo) repos.add(repo);
  }
  for (const command of plugin.install?.commands ?? []) {
    for (const spec of commandSpecs(command)) {
      const repo = githubIdentity(spec);
      const pkg = registryIdentity(spec);
      if (repo) repos.add(repo);
      else if (pkg) packages.add(pkg);
    }
  }
  return { packages, repos, conflict: packages.size > 1 || repos.size > 1 };
}

/** Return the unique market plugin with proven identity, or null on ambiguity.
 * Never use plugin.name, generic basenames, profile targets, or bundle row names.
 * Git refs/versions do not define identity; manager's installed version is retained.
 */
export function matchBundleToPlugin(bundle, plugins) {
  if (!bundle || !Array.isArray(plugins)) return null;
  const source = typeof bundle.source === 'string' ? bundle.source.trim() : '';
  const repo = githubIdentity(source);
  const alias = source.includes('npm:');
  const sourcePackage = alias || /^(?:@[^/]+\/[^@]+|[^@/]+)@[^@]+$/.test(source)
    ? registryIdentity(source) : null;
  const pkg = alias ? sourcePackage : registryIdentity(bundle.name);
  if (alias && !pkg) return null;
  if (!alias && sourcePackage && pkg && sourcePackage !== pkg) return null;
  const matches = [];
  for (const plugin of plugins) {
    if (!plugin || plugin.type === 'skill') continue;
    const claims = pluginClaims(plugin);
    const hit = (pkg && claims.packages.has(pkg)) || (repo && claims.repos.has(repo));
    if (!hit) continue;
    // A conflicting claimant also makes the result ambiguous, rather than letting
    // a competing claimant win merely because this one was filtered out.
    if (claims.conflict || (repo && claims.repos.size && !claims.repos.has(repo)) ||
        (pkg && claims.packages.size && !claims.packages.has(pkg))) return null;
    matches.push(plugin);
  }
  return matches.length === 1 ? matches[0] : null;
}

/** Current-profile native bundles plus caller-supplied legacy skills only.
 * Missing manager/API and read failures are explicit, never a cross-profile fallback.
 */
export async function managedInstalled(ctx, plugins, { legacySkills = [] } = {}) {
  const manager = typeof ctx?.get === 'function' ? ctx.get('pluginManager') : undefined;
  if (!manager || typeof manager.listBundles !== 'function') {
    throw new Error('宿主 pluginManager.listBundles 不可用，無法讀取目前 profile 的已安裝外掛。');
  }
  const bundles = await manager.listBundles();
  if (!Array.isArray(bundles)) throw new TypeError('pluginManager.listBundles 必須回傳 BundleInfo[]。');
  const installed = bundles.filter((bundle) => bundle?.installed === true && bundle.availability === 'profile')
    .map((bundle) => {
      const plugin = matchBundleToPlugin(bundle, plugins);
      return {
        pluginId: plugin?.id ?? null,
        localName: bundle.name,
        version: bundle.version ?? null,
        source: 'profile',
        plugin,
        nativeBundle: bundle.name,
        enabled: bundle.enabled,
        removable: bundle.removable,
      };
    });
  return [...installed, ...legacySkills.filter((item) => item?.source === 'skills')];
}
