import {lookupBundleVersion, lookupSourceVersion, canonicalGithubRepo, compareSourceVersions} from './source-versions.js';
import {requireTargetProfile} from './profile-runtime.js';

// These static guards deliberately mirror managedUpdate/withBundle. Query support
// (notably npm aliases) is broader than remove/reinstall support; do not conflate them.
function updateUnavailable(ctx, manager, bundle, options) {
  try { requireTargetProfile(ctx, options.targetProfile); }
  catch { return '目前 profile 未確認或與目標不符；請切換到目標 profile 的內建外掛管理。'; }
  if (bundle.name === '@dsh-market/plugin') return '不能在市場自己的請求內更新市場；請使用內建外掛管理。';
  if (!bundle.installed || bundle.availability !== 'profile' || !bundle.removable) return '套件不屬於目前 profile 或受宿主保護，不能由市場更新。';
  const registryName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
  const source = bundle.source ?? '';
  const registrySource = typeof source === 'string' && (source === bundle.name ||
    (source.startsWith(bundle.name + '@') && /^[0-9A-Za-z.*~^+|<>= -]+$/.test(source.slice(bundle.name.length + 1))));
  if (!registryName.test(bundle.name) || !registrySource || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(bundle.version ?? '')) {
    return '此來源不是可精確還原的 registry 套件；請使用內建外掛管理更新。';
  }
  if (['inspect', 'removeBundle', 'installBundle'].some(key => typeof manager[key] !== 'function')) return '宿主更新介面不可用；請使用內建外掛管理。';
  return null;
}
function baseResult(item) {
  return {localName:item?.localName??null,pluginId:item?.pluginId??null,current:item?.version??null,latest:null,hasUpdate:null,canUpdate:false,unavailableReason:null,kind:'none',status:'unsupported',checkedAt:new Date().toISOString(),cached:false,stale:false};
}
function failedResult(base, message) {
  return {...base,status:'error',hasUpdate:null,canUpdate:false,unavailableReason:message,error:message};
}

// Only compare a proven installed registry package with that registry's latest.
// canUpdate means a confirmed newer version AND statically eligible for the existing
// mutation path. It is not approval, a preflight guarantee or an automatic update.
// GitHub dates/releases never substitute for a failed npm query.
export async function checkManagedSourceUpdates(ctx, installed, options={}) {
  let manager, bundles;
  try {
    manager=ctx.get('pluginManager');
    if(typeof manager?.listBundles !== 'function') throw new Error('missing manager');
    bundles=await manager.listBundles();
    if(!Array.isArray(bundles)) throw new Error('invalid inventory');
  } catch {
    return installed.map(item=>failedResult(baseResult(item),'宿主套件清單不可用，未檢查版本。'));
  }
  const one=async item=>{
    let base=baseResult(null);
    try {
      base=baseResult(item);
      const bundle=bundles.find(b=>b.name===item.nativeBundle && b.installed===true && b.availability==='profile');
      // Read a fresh host version before comparing; the old UI snapshot may be stale.
      if(bundle?.version != null) base={...base,current:bundle.version};
      if(item.localName==='@dsh-market/plugin' || bundle?.name==='@dsh-market/plugin') {
        const message='此為 fork／portable 市場，請依固定 tag 更新，不與官方 npm 版本互相比較。';
        return {...base,unavailableReason:message,error:message};
      }
      if(!bundle) {
        const message='沒有目前 profile 的原生套件來源，未以索引時間或資料夾日期推測更新。';
        return {...base,unavailableReason:message,error:message};
      }
      const restriction=updateUnavailable(ctx,manager,bundle,options);
      const sources=await lookupBundleVersion(bundle,options);
      const npm=sources.npm;
      if(sources.primarySource!=='npm'){
        const repo=canonicalGithubRepo(bundle.source);
        const github=repo?(await lookupSourceVersion({id:repo},options)).github:null;
        const message='Git／本機來源不是 npm 發布渠道；不以 release 或修改時間判斷已是最新版，請檢查來源 ref。';
        return {...base,sourceURL:github?.sourceURL,checkedAt:github?.checkedAt??base.checkedAt,sourceObservation:github,unavailableReason:restriction??message,error:message};
      }
      const comparison=compareSourceVersions(base.current,npm.version);
      const failed=npm.status!=='ok'||npm.stale;
      const hasUpdate=failed||comparison===null?null:comparison<0;
      const error=failed?`npm 查詢未成功（${npm.status}: ${npm.reason??'unknown'}）；不能確認最新版本。`:comparison===null?'已裝或來源版本不是可比較的 semver，未推測更新。':null;
      const unavailableReason=restriction??error??(hasUpdate===true?null:'此 registry 未提供比目前已裝版本更新的 latest 版本。');
      return {...base,latest:npm.version,sourceURL:npm.sourceURL,checkedAt:npm.checkedAt,cached:npm.cached,stale:npm.stale,status:npm.status,reason:npm.reason,kind:failed||comparison===null?'none':'npm',comparison,hasUpdate,canUpdate:hasUpdate===true&&unavailableReason===null,unavailableReason,error};
    } catch {
      // One malformed source or unexpected lookup failure must not erase other rows.
      // Do not expose raw exception text (URLs/credentials may appear in it).
      return failedResult(base,'此套件版本查詢發生錯誤，未確認是否有新版；其他套件仍可檢查。');
    }
  };
  const results=[];
  for(let i=0;i<installed.length;i+=4)results.push(...await Promise.all(installed.slice(i,i+4).map(one)));
  return results;
}
