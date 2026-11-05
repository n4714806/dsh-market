import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

// Presentation-only regression: actual bundle, fake React, no real DOM or network.
const source = fs.readFileSync(new URL('./lib/client-tasks.js', import.meta.url), 'utf8');
function harness() {
  let exported, sequence=0;
  const stateWrites=[], clipboard=[], appended=[], timers=new Map();
  const react={Component:class {},
    createElement(type, props, ...children) { const next={...(props||{})}; if(children.length) next.children=children.length===1?children[0]:children; return {type,props:next}; },
    useState(initial) { const value=typeof initial==='function'?initial():initial; return [value,next=>stateWrites.push(typeof next==='function'?next(value):next)]; },
    useRef: value=>({current:value}), useEffect(){}, useMemo: fn=>fn(), useSyncExternalStore:()=>true,
  };
  const document={querySelector:()=>({}),querySelectorAll:()=>[],createElement:()=>({setAttribute(){},remove(){}}),body:{appendChild(node){appended.push(node);}}};
  const context={console,AbortController,document,navigator:{clipboard:{async writeText(text){clipboard.push(text);}}},localStorage:{getItem:()=>null},
    setTimeout(fn,delay){timers.set(++sequence,{fn,delay});return sequence;},clearTimeout:id=>timers.delete(id),
    fetch(){assert.fail('Presentation tests must not issue network requests');},
    window:{__ModuleLoader__:{load({factory}){exported=factory(name=>{assert.equal(name,'react');return react;});}}},
  };
  const exposed='exports.testing={setupTraditionalLocale,toTraditionalText,createTraditionalElement,El,El$1,toast,MarketTrigger,MarketPanel,ErrorOutlet,copyText,SearchTab,apply}; exports.apply = apply;';
  vm.runInNewContext(source.replace('exports.apply = apply;',exposed),context);
  return {...exported.testing,react,stateWrites,clipboard,appended};
}
const children=n=>n?.props?.children;
const walk=n=>Array.isArray(n)?n.flatMap(walk):!n||typeof n!=='object'?[]:[n,...walk(children(n))];
const flattenText=n=>Array.isArray(n)?n.map(flattenText).join(' '):typeof n==='string'||typeof n==='number'?String(n):n&&typeof n==='object'?flattenText(children(n)):'';

test('locale registration is effect-owned, restores prior translator, and never changes user locale',()=>{
  const h=harness(), registrations=[], bindings=[], disposed=[], cleanups=[];
  const contextFor=prefix=>({
    get(name){
      if(name==='layout') return {selectPanel(){}};
      assert.equal(name,'locale');
      return {
        register(namespace,locale,phrases){
          registrations.push({namespace,locale,phrases});
          return ()=>disposed.push(prefix);
        },
        bind(namespace){bindings.push(namespace);return value=>`${prefix}：${value}`;},
        get setLocale(){assert.fail('Plugin must never access or set the user locale');},
      };
    },
    effect(register){cleanups.push(register());},
    slots:{inject(){}},
  });
  h.apply(contextFor('甲'));
  assert.equal(registrations.length,1,'Client apply installs the optional locale integration');
  assert.equal(registrations[0].namespace,'dsh-market-portable-ui');assert.equal(registrations[0].locale,'zh-TW');
  assert.equal(registrations[0].phrases['皇后'],'皇后');assert.ok(Object.keys(registrations[0].phrases).length>100);
  assert.deepEqual(bindings,['dsh-market-portable-ui']);
  assert.equal(h.toTraditionalText('设置'),'甲：設定','bound translator runs before display conversion');
  h.setupTraditionalLocale(contextFor('乙'));assert.equal(h.toTraditionalText('设置'),'乙：設定');
  cleanups.pop()();assert.equal(h.toTraditionalText('设置'),'甲：設定','nested cleanup restores previous translator');
  cleanups.pop()();assert.equal(h.toTraditionalText('设置'),'設定','last cleanup removes binding but retains local fallback');
  assert.deepEqual(disposed,['乙','甲']);
  h.setupTraditionalLocale({get:()=>undefined,effect(){assert.fail('Missing optional locale must register no effects');}});
  assert.equal(h.toTraditionalText('设置'),'設定');
});

test('conversion changes visible simplified Chinese, preserving ASCII and non-text values',()=>{
  const h=harness();
  assert.equal(h.toTraditionalText('市场 推荐 错误 复制 诊断'),'市場 推薦 錯誤 複製 診斷');
  assert.equal(h.toTraditionalText('皇后 头发 开发'),'皇后 頭髮 開發');
  assert.equal(h.toTraditionalText('插件 设置 默认 用户 文件 卸载 网络'),'外掛 設定 預設 使用者 檔案 解除安裝 網路');
  assert.equal(h.toTraditionalText('npm @scope/name 1.2.3 https://example.com/a?b=c'),'npm @scope/name 1.2.3 https://example.com/a?b=c');
  for(const raw of [null,undefined,0,false]) assert.equal(h.toTraditionalText(raw),raw);
  const raw={message:'错误'};assert.equal(h.toTraditionalText(raw),raw);assert.equal(raw.message,'错误');
});

test('intrinsic element text and accessibility labels convert without modifying identifiers or event values',()=>{
  const h=harness(), click=()=>{}, raw={title:'设置错误',placeholder:'输入关键词','aria-label':'复制诊断',id:'设置',name:'设置',value:'设置',defaultValue:'设置',href:'https://example.com/设置',src:'/设置.svg','data-key':'设置',onClick:click};
  const snapshot={...raw};
  const node=h.createTraditionalElement('a',raw,'推荐');
  for(const key of ['title','placeholder','aria-label']) assert.equal(node.props[key],h.toTraditionalText(raw[key]));
  for(const key of ['id','name','value','defaultValue','href','src','data-key','onClick']) assert.equal(node.props[key],raw[key]);
  assert.deepEqual(raw,snapshot);assert.equal(flattenText(node),'推薦');
  const option=h.createTraditionalElement('option',{value:'记事本'},'记事本');
  assert.equal(option.props.value,'记事本');assert.equal(flattenText(option),'記事本');
  const input=h.createTraditionalElement('input',{value:'用户实际输入',placeholder:'输入关键词'});
  assert.equal(input.props.value,'用户实际输入');assert.equal(input.props.placeholder,h.toTraditionalText('输入关键词'));
  const implicit=h.createTraditionalElement('option',null,'记事本');assert.equal(implicit.props.value,'记事本');assert.equal(flattenText(implicit),'記事本');
});

test('commands, code, preformatted diagnostics and textarea values remain byte-identical',()=>{
  const h=harness(), raw='npm install "简体包"\n{"error":"错误","path":"C:\\用户\\设置"}';
  for(const tag of ['code','pre','textarea','script','style']) {
    const node=h.createTraditionalElement(tag,{value:raw},raw);
    assert.equal(node.props.value,raw);assert.equal(flattenText(node),raw,tag);
  }
});

test('array children and props.children are localized without mutating input arrays',()=>{
  const h=harness(), nested=['推荐',['设置',null,3,false]];
  const node=h.createTraditionalElement('div',null,nested);
  assert.match(flattenText(node),/推薦/);assert.doesNotMatch(flattenText(node),/设置/);
  assert.equal(nested[0],'推荐');assert.equal(nested[1][0],'设置');
  const fromProps=h.createTraditionalElement('div',{children:'复制诊断'});
  assert.equal(flattenText(fromProps),'複製診斷');
  const code=h.createTraditionalElement('code',null,'npm install 简体包');
  const mixed=h.createTraditionalElement('div',null,['错误',code]);
  assert.match(flattenText(mixed),/錯誤/);assert.equal(children(mixed)[1],code);assert.equal(flattenText(code),'npm install 简体包');
});

test('custom React component props and children retain raw business values',()=>{
  const h=harness(), Component=()=>null, data={name:'设置',commands:['安装']}, props={title:'设置',value:'设置',plugin:data,children:'错误'};
  const node=h.createTraditionalElement(Component,props,'诊断');
  assert.equal(node.type,Component);assert.equal(node.props.title,'设置');assert.equal(node.props.value,'设置');assert.equal(node.props.plugin,data);assert.equal(children(node),'诊断');
  const nodeFromProps=h.createTraditionalElement(Component,props);assert.equal(children(nodeFromProps),'错误');assert.equal(props.children,'错误');
});

test('both element helpers, market menu and direct trigger use the presentation converter',()=>{
  const h=harness();assert.equal(flattenText(h.El('span',null,'推荐')),'推薦');assert.equal(flattenText(h.El$1('span',null,'诊断')),'診斷');
  const trigger=h.MarketTrigger({wide:true});assert.equal(trigger.props.title,'外掛市場');assert.equal(trigger.props['aria-label'],'外掛市場');assert.match(flattenText(trigger),/外掛市場/);
  const panel=h.MarketPanel({mode:'main',onClose(){}}), labels=walk(panel).filter(n=>n.type==='button').map(flattenText);
  assert.ok(labels.includes('推薦'));assert.ok(labels.includes('已裝'));assert.ok(labels.some(label=>label==='設置'||label==='設定'));
  assert.ok(labels.includes('安裝任務'));assert.ok(!labels.includes('推荐'));
});

test('toast and ErrorOutlet localize visible guidance while raw error code stays unchanged',()=>{
  const h=harness();h.toast('查询失败：网络错误');assert.equal(h.appended.at(-1).textContent,'查詢失敗：網路錯誤');
  const retry=()=>{}, error=new Error('原始错误 raw diagnostic');const tree=h.ErrorOutlet({error,label:'设置',onRetry:retry});
  const labels=walk(tree).filter(n=>n.type==='button').map(flattenText);
  assert.ok(labels.includes('重試'));assert.ok(labels.includes('複製診斷'));
  assert.equal(walk(tree).find(n=>n.type==='button'&&flattenText(n)==='重試').props.onClick,retry);
  assert.equal(flattenText(walk(tree).find(n=>n.type==='code')),'Error: 原始错误 raw diagnostic');assert.equal(error.message,'原始错误 raw diagnostic');
});

test('clipboard copies exact original diagnostics, not display-converted text',async()=>{
  const h=harness(), raw='原始错误\n命令 npm install 简体包\n诊断路径 C:\\用户\\设置';
  assert.equal(await h.copyText(raw),true);assert.deepEqual(h.clipboard,[raw]);
});

test('actual Chinese category labels render traditional but clicks retain the original lookup key',()=>{
  const h=harness(), plugins=Array.from({length:3},(_,i)=>({id:`notes-${i}`,name:`notes-${i}`,fullName:`example/notes-${i}`,type:'skill',tags:['notes','记事本'],stars:1}));
  const snapshot=JSON.stringify(plugins), tree=h.SearchTab({plugins,onInstall(){},onTagClick(){}});
  const category=walk(tree).find(n=>n.type==='span'&&typeof n.props.onClick==='function'&&n.props.title?.includes('記事本'));
  assert.ok(category,'the actual SearchTab must expose a traditional 記事本 category');assert.match(flattenText(category),/記事本/);
  category.props.onClick();assert.ok(h.stateWrites.includes('记事本'),'lookup receives original simplified key');assert.ok(!h.stateWrites.includes('記事本'));
  assert.equal(JSON.stringify(plugins),snapshot,'catalog and tags must never be rewritten');
});
