import {lookupBundleVersion, lookupSourceVersion, canonicalGithubRepo, compareSourceVersions} from './source-versions.js';

// Only compare a proven installed registry package with that registry's latest.
// GitHub dates/releases never substitute for a failed npm query.
export async function checkManagedSourceUpdates(ctx, installed, options={}) {
  const manager=ctx.get('pluginManager');
  if(!manager?.listBundles)throw new Error('宿主套件清單不可用，未檢查版本。');
  const bundles=(await manager.listBundles()).filter(b=>b.installed===true&&b.availability==='profile');
  const one=async item=>{
    const base={localName:item.localName,pluginId:item.pluginId,current:item.version??null,latest:null,hasUpdate:null,kind:'none',status:'unsupported',checkedAt:new Date().toISOString(),cached:false,stale:false};
    if(item.localName==='@dsh-market/plugin')return {...base,error:'此為 fork／portable 市場，請依固定 tag 更新，不與官方 npm 版本互相比較。'};
    const bundle=bundles.find(b=>b.name===item.nativeBundle);
    if(!bundle)return {...base,error:'沒有目前 profile 的原生套件來源，未以索引時間或資料夾日期推測更新。'};
    const sources=await lookupBundleVersion(bundle,options);
    const npm=sources.npm;
    if(sources.primarySource!=='npm'){
      const repo=canonicalGithubRepo(bundle.source);
      const github=repo?(await lookupSourceVersion({id:repo},options)).github:null;
      return {...base,sourceURL:github?.sourceURL,checkedAt:github?.checkedAt??base.checkedAt,sourceObservation:github,error:'Git／本機來源不是 npm 發布渠道；不以 release 或修改時間判斷已是最新版，請檢查來源 ref。'};
    }
    const comparison=compareSourceVersions(base.current,npm.version);
    const failed=npm.status!=='ok'||npm.stale;
    return {...base,latest:npm.version,sourceURL:npm.sourceURL,checkedAt:npm.checkedAt,cached:npm.cached,stale:npm.stale,status:npm.status,reason:npm.reason,kind:failed||comparison===null?'none':'npm',comparison,hasUpdate:failed||comparison===null?null:comparison<0,error:failed?`npm 查詢未成功（${npm.status}: ${npm.reason??'unknown'}）；不能確認最新版本。`:comparison===null?'已裝或來源版本不是可比較的 semver，未推測更新。':null};
  };
  const results=[];
  for(let i=0;i<installed.length;i+=4)results.push(...await Promise.all(installed.slice(i,i+4).map(one)));
  return results;
}
