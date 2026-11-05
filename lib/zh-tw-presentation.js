// Display-only localization: identifiers, data, commands and clipboard inputs remain raw.
let zhTwBuckets;
let marketLocaleTranslate;
function setupTraditionalLocale(ctx) {
  const locale=ctx.get('locale');
  if(!locale?.register||!locale?.bind)return;
  ctx.effect(()=>{
    const dispose=locale.register('dsh-market-portable-ui','zh-TW',ZH_TW_PHRASES);
    const previous=marketLocaleTranslate;
    marketLocaleTranslate=locale.bind('dsh-market-portable-ui');
    return ()=>{marketLocaleTranslate=previous;dispose();};
  });
}
const zhTwUiWords = {"插件":"外掛","設置":"設定","配置":"設定","默認":"預設","用戶":"使用者","文件夾":"資料夾","文件":"檔案","文檔":"文件","卸載":"解除安裝","網絡":"網路","保存":"儲存","服務器":"伺服器","運行":"執行","信息":"資訊","鼠標":"滑鼠","搜索":"搜尋","回滾":"還原"};
const zhTwUiPattern = new RegExp(Object.keys(zhTwUiWords).sort((a,b)=>b.length-a.length).join('|'),'g');
function toTraditionalText(value) {
  if(typeof value !== 'string' || !/[\u3400-\u9fff]/.test(value))return value;
  // Use the Host's locale namespace for known phrases; dynamic server text falls back to the same display dictionary.
  if(marketLocaleTranslate)value=marketLocaleTranslate(value);
  if(!zhTwBuckets){zhTwBuckets=Object.create(null);for(const key of Object.keys(ZH_TW_PHRASES))(zhTwBuckets[key[0]]??=[]).push(key);for(const list of Object.values(zhTwBuckets))list.sort((a,b)=>b.length-a.length);}
  let output='';
  for(let i=0;i<value.length;){let matched=false;for(const key of zhTwBuckets[value[i]]??[]){if(value.startsWith(key,i)){output+=ZH_TW_PHRASES[key];i+=key.length;matched=true;break;}}if(!matched){output+=ZH_TW_CHARS[value[i]]??value[i];i++;}}
  return output.replace(zhTwUiPattern,word=>zhTwUiWords[word]);
}
function createTraditionalElement(tag, props, ...children) {
  if(typeof tag !== 'string')return react.createElement(tag,props??{},...children);
  const raw=['code','pre','textarea','script','style'].includes(tag)||props?.['data-market-raw']===true;
  if(raw)return react.createElement(tag,props??{},...children);
  const next={...(props??{})};
  for(const key of ['title','placeholder','aria-label','alt'])if(typeof next[key]==='string')next[key]=toTraditionalText(next[key]);
  const display=value=>Array.isArray(value)?value.map(display):typeof value==='string'?toTraditionalText(value):value;
  // An option's text is its implicit value: retain that value before translating its label.
  if(tag==='option'&&next.value===undefined){const label=children.length?children:next.children;if(typeof label==='string')next.value=label;else if(Array.isArray(label)&&label.every(v=>typeof v==='string'||typeof v==='number'))next.value=label.join('');}
  if(children.length)return react.createElement(tag,next,...children.map(display));
  if(Object.hasOwn(next,'children'))next.children=display(next.children);
  return react.createElement(tag,next);
}
