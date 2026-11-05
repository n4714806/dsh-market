import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const path=new URL('lib/client-tasks.js',root);
let source=readFileSync(path,'utf8').replace(/\r\n/g,'\n');
const begin='// BEGIN ZH-TW PRESENTATION',end='// END ZH-TW PRESENTATION';
const block=begin+'\n'+readFileSync(new URL('lib/zh-tw-data.js',root),'utf8')+readFileSync(new URL('lib/zh-tw-presentation.js',root),'utf8')+'\n'+end;
if(source.includes(begin)){const a=source.indexOf(begin),b=source.indexOf(end,a);if(b<0)throw new Error('Incomplete localization marker');source=source.slice(0,a)+block+source.slice(b+end.length);}
else{const marker='let react = require("react");';if(source.split(marker).length!==2)throw new Error('Missing unique React factory');source=source.replace(marker,marker+'\n'+block);}
for(const name of ['El','El$1'])source=source.replace(`function ${name}(tag, props, ...children) {\n\t\t\treturn (0, react.createElement)(tag, props ?? {}, ...children);`,`function ${name}(tag, props, ...children) {\n\t\t\treturn createTraditionalElement(tag, props, ...children);`);
source=source.replace('function apply(ctx) {\n\t\t\tconst layout', 'function apply(ctx) {\n\t\t\tsetupTraditionalLocale(ctx);\n\t\t\tconst layout');
source=source.replace('el.textContent = msg;','el.textContent = toTraditionalText(msg);');
source=source.replace('alert(`保存失败：${e.message}`);','alert(toTraditionalText(`保存失败：${e.message}`));');
source=source.replaceAll('label: "插件市场"','label: toTraditionalText("插件市场")');
const start=source.indexOf('function MarketTrigger(props) {'),finish=source.indexOf('function MarketRailIcon(props)',start);
if(start<0||finish<0)throw new Error('Missing legacy trigger');
source=source.slice(0,start)+source.slice(start,finish).replaceAll('(0, react.createElement)','createTraditionalElement')+source.slice(finish);
writeFileSync(path,source);
writeFileSync(new URL('lib/client-optimized-v2.js',root),source);
console.log('Built display-only zh-TW UI and synchronized legacy artifact.');
