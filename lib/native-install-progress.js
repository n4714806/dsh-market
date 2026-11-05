import { randomUUID } from 'node:crypto';
import { requireTargetProfile } from './profile-runtime.js';
// Use the current Host manager in Desktop, Web, and profile-launched CLI hosts.
export function installSpec(plugin) {
  const specs = [];
  for (const command of plugin.install?.commands ?? []) {
    const match = command.trim().match(/^dsh\s+plugin\s+(?:--profile\s+[\w-]+\s+)?add\s+(?:"([^"\r\n]+)"|'([^'\r\n]+)'|([^\s]+))\s*$/);
    const spec = match && (match[1] || match[2] || match[3]);
    if (spec && /^(?:@[\w.-]+\/)?[\w.-]+(?:@[\w.^~+*-]+)?$/.test(spec)) specs.push(spec);
    else if (spec && /^github:[\w.-]+\/[\w.-]+(?:#[\w./-]+)?$/.test(spec)) specs.push(spec);
  }
  const unique = [...new Set(specs)];
  if (unique.length === 1) return unique[0];
  if (/^[\w.-]+\/[\w.-]+$/.test(plugin.id)) return `github:${plugin.id}`;
  throw new Error('無法確認安全的安裝來源；請使用內建「外掛」頁面安裝。');
}
export async function nativeInstall(ctx, plugin, args = {}, signal, report = () => {}) {
  const profile = requireTargetProfile(ctx, args.targetProfile);
  const manager = ctx.get('pluginManager');
  if (!manager || typeof manager.inspect !== 'function' || typeof manager.installBundle !== 'function') throw new Error('宿主插件管理器不可用，未執行任何 shell 安裝。');
  if (args.security) throw new Error('安全審查後的安裝尚未遷移至宿主 API；請改用內建「外掛」頁面，不會略過審查自動安裝。');
  const spec = installSpec(plugin);
  signal?.throwIfAborted();
  if (args.dryRun) return {ok:true, dryRun:true, spec, profile:profile.name, mode:'native', started:false};
  signal?.throwIfAborted();
  report({stage:'inspecting',message:'正在確認套件來源及相容性'});
  const inspection = await manager.inspect(spec, undefined, signal);
  if (inspection.status === 'refused') throw new Error(inspection.reason || inspection.problem);
  if (inspection.status !== 'accepted') throw new Error('宿主未確認此安裝來源，已停止。');
  const requestId = `market-native-${args.installId || randomUUID()}`;
  const cancel = () => { void manager.cancelInstall?.(requestId)?.catch(console.error); };
  signal?.addEventListener('abort', cancel, {once:true});
  let result;
  try {
    signal?.throwIfAborted();
    report({stage:'installing',message:'宿主套件管理器執行中；下載與啟用結果尚未確認'});
    result = await manager.installBundle(spec, {enabled:true, requestId});
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
  if (result.error?.code === 'already-installed') {
    // Do not claim activation or silently enable an existing disabled plugin.
    throw new Error('此套件已安裝；請到內建「外掛」頁面確認啟用狀態，毋須重複安裝。');
  }
  if (result.pendingBuilds?.length) throw Object.assign(new Error(`需要確認建置腳本：${result.pendingBuilds.join(', ')}。請到內建「外掛」頁面處理。`), {stage:"needs-approval"});
  if (!['applied', 'restart-required'].includes(result.application) || result.error) {
    throw new Error(result.error?.diagnostic || result.error?.code || result.packageResult?.output || `安裝未完成：${result.application}`);
  }
  return {ok:true, started:false, childSessionId:null, mode:'native', application:result.application, stage:result.application, warnings:result.warnings ?? [], bundle:result.bundle, version:result.version, profile:profile.name, spec};
}
