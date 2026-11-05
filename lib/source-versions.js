// Read-only, per-entry source observations, NOT a market-wide synchronization.
// No filesystem/config/token reads. Caller must supply the installation registry
// when it is known; default npmjs is explicitly reported, not inferred as local config.
const TTL = 300_000;
const LIMIT = 500;
const cache = new Map();
const pending = new Map();
const fetchIds = new WeakMap();
let nextFetchId = 0;
const PACKAGE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

function packageIdentity(spec) {
  if (typeof spec !== 'string') return null;
  const alias = spec.indexOf('npm:');
  if (alias >= 0) {
    if (alias && (spec[alias - 1] !== '@' || !PACKAGE.test(spec.slice(0, alias - 1)))) return null;
    spec = spec.slice(alias + 4);
  }
  const m = spec.match(/^(@[^/]+\/[^@]+|[^@]+)(?:@([a-zA-Z0-9*^~.+_-]+))?$/);
  return m && PACKAGE.test(m[1]) ? m[1] : null;
}

export function canonicalGithubRepo(value) {
  if (typeof value !== 'string') return null;
  const raw = value.trim().replace(/^git\+/, '').replace(/^github:/i, '')
    .replace(/^git@github\.com:/i, '').replace(/^(?:https?|git|ssh):\/\/(?:git@)?github\.com\//i, '');
  const m = raw.match(/^([a-z0-9][a-z0-9-]*)\/([a-z0-9_.-]+?)(?:\.git)?\/?(?:#[a-z0-9._/-]+)?$/i);
  return m && !['.', '..'].includes(m[2]) ? `${m[1]}/${m[2]}`.toLowerCase() : null;
}

/** One proven package only; never CLI runner, install.target, display name or id. */
export function extractNpmPackage(plugin) {
  const commands = plugin?.install?.commands;
  if (!Array.isArray(commands) || commands.length !== 1) return null;
  const command = commands[0];
  if (typeof command !== 'string' || /[\r\n;&|`$<>\\]/.test(command)) return null;
  const tokens = command.trim().match(/"[^"\r\n]*"|'[^'\r\n]*'|[^\s]+/g) ?? [];
  const words = tokens.map(s => /^(["']).*\1$/.test(s) ? s.slice(1, -1) : s);
  if (words.some(s => /[\s"']/.test(s))) return null;
  let i;
  if (words[0] === 'dsh') {
    i = 1;
    if (words[i] === '--profile' && words[i + 1] && !words[i + 1].startsWith('-')) i += 2;
    if (words[i++] !== 'plugin') return null;
    if (words[i] === '--profile' && words[i + 1] && !words[i + 1].startsWith('-')) i += 2;
    if (words[i++] !== 'add') return null;
  } else if ((words[0] === 'npm' && ['install', 'i'].includes(words[1])) ||
             (words[0] === 'pnpm' && words[1] === 'add')) i = 2;
  else return null;
  return words.length === i + 1 ? packageIdentity(words[i]) : null;
}

/** Native bundle lookup requires a registry-spec source, not just a package-like name.
 * Git/local sources intentionally remain unsupported even if bundle.name is valid.
 */
export async function lookupBundleVersion(bundle, options = {}) {
  const source = typeof bundle?.source === 'string' ? bundle.source.trim() : '';
  const pkg = packageIdentity(source);
  const alias = source.includes('npm:');
  const proven = pkg && (alias || pkg === bundle?.name);
  return lookupSourceVersion(proven ? { install: { commands: [`npm install ${pkg}`] } } : {}, options);
}

function parseSemver(value) {
  if (typeof value !== 'string') return null;
  const m = value.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/);
  if (!m) return null;
  const pre = m[4]?.split('.') ?? [];
  if (pre.some(p => /^\d+$/.test(p) && p.length > 1 && p[0] === '0')) return null;
  return { nums: m.slice(1, 4), pre };
}
function numericCompare(a, b) { return a.length !== b.length ? Math.sign(a.length - b.length) : a === b ? 0 : a < b ? -1 : 1; }
/** null = not comparable, never lexical fallback. Does NOT establish channel identity. */
export function compareSourceVersions(a, b) {
  const x = parseSemver(a), y = parseSemver(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) { const c = numericCompare(x.nums[i], y.nums[i]); if (c) return c; }
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i];
    if (p === q) continue;
    if (p === undefined || q === undefined) return p === undefined ? -1 : 1;
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q);
    if (pn && qn) return numericCompare(p, q);
    if (pn !== qn) return pn ? -1 : 1;
    return p < q ? -1 : 1;
  }
  return 0;
}
function observation(sourceURL, status, reason, extras = {}) {
  return { status, version: null, sourceURL, checkedAt: new Date().toISOString(), cached: false, stale: false, reason, ...extras };
}
function registryBase(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) return null;
    return u.href.replace(/\/+$/, '');
  } catch { return null; }
}
function retryAt(headers) {
  const retry = headers?.get?.('retry-after');
  const reset = headers?.get?.('x-ratelimit-reset');
  const at = retry ? (/^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry)) : reset ? Number(reset) * 1000 : NaN;
  return Number.isFinite(at) && at <= 8.64e15 ? new Date(at).toISOString() : null;
}
async function request(sourceURL, kind, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')); }, timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const origin = new URL(sourceURL).origin;
      let res;
      for (let redirects = 0; ; redirects++) {
        if (controller.signal.aborted) throw new Error('timeout');
        res = await fetchImpl(sourceURL, {
          signal: controller.signal, redirect: 'manual', cache: 'no-store',
          headers: { Accept: kind === 'npm' ? 'application/json' : 'application/vnd.github+json', 'User-Agent': 'dsh-market-source-versions' },
        });
        if (controller.signal.aborted) throw new Error('timeout');
        if (![301, 302, 303, 307, 308].includes(res.status)) break;
        // Dispose the unused redirect body without extending the total deadline.
        try { Promise.resolve(res.body?.cancel?.()).catch(() => {}); } catch { /* no body */ }
        if (redirects >= 3) return observation(sourceURL, 'error', 'redirect-limit');
        const location = res.headers?.get?.('location');
        let next;
        try { next = location ? new URL(location, sourceURL) : null; } catch { next = null; }
        if (!next || !['http:', 'https:'].includes(next.protocol) || next.origin !== origin || next.username || next.password) {
          return observation(sourceURL, 'error', 'unsafe-or-invalid-redirect');
        }
        next.hash = '';
        sourceURL = next.href;
      }
      if (!res.ok) {
        const retryAfter = retryAt(res.headers);
        const limited = res.status === 429 || (res.status === 403 &&
          (res.headers?.get?.('retry-after') != null || res.headers?.get?.('x-ratelimit-remaining') === '0'));
        return observation(sourceURL, limited ? 'rate-limited' : res.status === 404 ? 'unavailable' : 'error',
          limited ? 'rate-limit' : res.status === 404 ? 'not-found' : `http-${res.status}`, { httpStatus: res.status, retryAfter: limited ? retryAfter : null });
      }
      const data = await res.json();
      if (kind === 'npm') {
        const version = data?.['dist-tags']?.latest;
        return parseSemver(version) ? observation(sourceURL, 'ok', null, { version }) :
          observation(sourceURL, 'unavailable', 'no-semver-dist-tag-latest');
      }
      const tagName = typeof data?.tag_name === 'string' ? data.tag_name.slice(0, 256) : null;
      // target_commitish may be a branch name: never label it a commit hash.
      const extra = { tagName, commit: null };
      return !data?.draft && !data?.prerelease && parseSemver(tagName) ?
        observation(sourceURL, 'ok', null, { ...extra, version: tagName.replace(/^v/, '') }) :
        observation(sourceURL, 'unavailable', 'no-matching-semver-release', extra);
    })()]);
  } catch {
    return observation(sourceURL, 'error', controller.signal.aborted ? 'timeout' : 'network-or-invalid-response');
  } finally { clearTimeout(timer); }
}
async function lookup(sourceURL, kind, options) {
  if (!fetchIds.has(options.fetchImpl)) fetchIds.set(options.fetchImpl, ++nextFetchId);
  const key = `${fetchIds.get(options.fetchImpl)}:${options.timeoutMs}:${kind}:${sourceURL}`;
  // force bypasses settled cache; concurrent force/non-force callers share a live request.
  if (pending.has(key)) return { ...await pending.get(key) };
  const previous = cache.get(key);
  if (!options.force && previous && Date.now() - previous.at < TTL) return { ...previous.value, cached: true };
  if (pending.size >= LIMIT) return observation(sourceURL, 'unavailable', 'lookup-capacity');
  const work = (async () => {
    let value = await request(sourceURL, kind, options);
    const good = value.status === 'ok' ? value : previous?.good;
    if (value.status !== 'ok' && good) value = { ...value, version: good.version, stale: true, lastGoodAt: good.checkedAt };
    cache.delete(key);
    cache.set(key, { at: Date.now(), value, good });
    while (cache.size > LIMIT) cache.delete(cache.keys().next().value);
    return value;
  })();
  pending.set(key, work);
  try { return { ...await work }; } finally { pending.delete(key); }
}

/**
 * {primarySource,npm,github}; each source has status/version/sourceURL/checkedAt/
 * cached/stale/reason. A stale version is last-known only; status stays the failure.
 * npm dist-tags.latest and GitHub latest release are independent publication channels.
 * No cross-channel comparison, HEAD/tag enumeration, or update/install inference.
 * registry defaults to public npm; this does not read or claim the profile's registry.
 */
export async function lookupSourceVersion(plugin, { force = false, fetchImpl = globalThis.fetch, timeoutMs = 10_000, registry = 'https://registry.npmjs.org' } = {}) {
  const pkg = extractNpmPackage(plugin);
  const repos = new Set([plugin?.fullName, plugin?.id, plugin?.owner && plugin?.repo ? `${plugin.owner}/${plugin.repo}` : null]
    .map(canonicalGithubRepo).filter(Boolean));
  const repo = repos.size === 1 ? [...repos][0] : null;
  const base = registryBase(registry);
  const options = { force, fetchImpl, timeoutMs: Number.isFinite(timeoutMs) ? Math.max(1, Math.min(60_000, timeoutMs)) : 10_000 };
  const npmURL = pkg && base ? `${base}/${encodeURIComponent(pkg)}` : null;
  const githubURL = repo ? `https://api.github.com/repos/${repo}/releases/latest` : null;
  const [npm, github] = await Promise.all([
    npmURL && typeof fetchImpl === 'function' ? lookup(npmURL, 'npm', options) : observation(npmURL, 'unsupported', !pkg ? 'no-unambiguous-npm-install-command' : !base ? 'invalid-registry' : 'fetch-unavailable'),
    githubURL && typeof fetchImpl === 'function' ? lookup(githubURL, 'github', options) : observation(githubURL, 'unsupported', !repo ? 'no-unambiguous-canonical-repo' : 'fetch-unavailable'),
  ]);
  return { primarySource: pkg ? 'npm' : repo ? 'github' : null, npm: { ...npm, packageName: pkg, registry: base }, github: { ...github, repo, commit: null } };
}
