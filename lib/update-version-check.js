// pluginManager.listBundles rereads manifest versions; these are installed versions,
// not proof that a running fiber has loaded a particular JavaScript generation.
export async function checkUpdatedVersion(manager,name,before,expected) {
  const base={before,expected,installed:null,inventory:null,status:'unknown',checkedAt:new Date().toISOString()};
  try {
    const rows=await manager.listBundles();
    const row=rows.find(b=>b.name===name&&b.installed===true&&b.availability==='profile');
    const installed=typeof row?.version==='string'?row.version:null;
    if(!installed)return {...base,reason:'未能讀取目前 profile 的已裝版本，不能確認更新。'};
    return {...base,installed,inventory:installed,status:installed===expected?'verified':installed===before?'unchanged':'mismatch',reason:installed===expected?null:installed===before?'重新讀取後仍是原版本；操作完成不代表版本已更新。':'已裝版本與指定目標不符，請到內建外掛管理檢查。'};
  }catch{return {...base,reason:'宿主版本重新檢測失敗，不能確認更新；請重試檢測。'};}
}
