// Profile facts come from the same Host context used by pluginManager.
// Do not derive directories from profile names or ambient DSH_PROFILE variables.
export function currentProfile(ctx) {
  const profile = ctx.get('profileContext');
  if (!profile || typeof profile.name !== 'string' || !profile.name.trim() ||
      typeof profile.dir !== 'string' || !profile.dir.trim()) return null;
  return {name: profile.name, dir: profile.dir, source: 'host'};
}
export function requireTargetProfile(ctx, requested) {
  const profile = currentProfile(ctx);
  if (!profile) throw new Error('宿主未提供目前 profile 資訊；為避免安裝到錯誤位置，已停止。請使用該環境的內建插件管理功能。');
  if (requested != null && requested !== '' && requested !== profile.name) {
    throw new Error(`目前服務使用「${profile.name}」，不能從此市場修改「${requested}」。請切換到目標 profile 的服務後操作。`);
  }
  return profile;
}
