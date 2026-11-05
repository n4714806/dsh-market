// Read the exact immutable bytes the Host advertises, not just package metadata.
import {basename} from 'node:path';
export async function clientBuildInfo(ctx) {
  const modules=ctx.get('clientModules');
  if(!modules?.graph||!modules?.fetchBundle)return {available:false,reason:'client-modules-unavailable'};
  const entry=modules.graph().entries.find(e=>e.id==='@dsh-market/plugin');
  if(!entry)return {available:false,reason:'market-client-not-registered'};
  const response=await modules.fetchBundle(new Request(new URL(entry.url,'http://localhost')));
  if(!response.ok)return {available:false,reason:'advertised-artifact-unavailable',httpStatus:response.status};
  const source=await response.text();
  return {available:true,id:entry.id,revision:entry.rev,url:entry.url,file:basename(modules.clientPath?.(entry.id)??''),hasTasks:source.includes('const TASK_STATUS'),hasOneClickUpdates:source.includes('一鍵更新')&&source.includes('installedUpdateAvailability(i, updateMap[i.localName]).allowed'),hasOfficialSelfUpdate:source.includes('api("update:self"'),uiLocale:source.includes('function toTraditionalText(value)')?'zh-TW':null,clientBuild:source.match(/任務追蹤版 \.(\d+)/)?`portable.${source.match(/任務追蹤版 \.(\d+)/)[1]}`:'legacy'};
}
