import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {analyzeRegistryPackage,readRegistrySource} from './lib/compat-source.js';

const NAME='@scope/pkg';
const URL='https://registry.npmjs.org/@scope/pkg/-/pkg-2.0.0.tgz';
const sri=b=>'sha512-'+createHash('sha512').update(b).digest('base64');
const manifest=(version='2.0.0',extra={})=>({name:NAME,version,engines:{dsh:'^0.2.2-rc.1'},dist:{tarball:URL,integrity:sri(Buffer.from('fixture'))},...extra});
const metadata=(manifests=[manifest()],latest=manifests[0].version)=>({name:NAME,'dist-tags':{latest},versions:Object.fromEntries(manifests.map(m=>[m.version,m]))});
const fetchJSON=data=>async()=>new Response(JSON.stringify(data));
const analyze=(data,opts={})=>analyzeRegistryPackage(NAME,'0.2.1-rc.5',{fetchImpl:fetchJSON(data),...opts});
const rejects=(promise,code)=>assert.rejects(promise,e=>e.code===code&&!e.message.includes('secret'),code);

function header(name,bytes=Buffer.alloc(0),type='0',overrides={}){
  const h=Buffer.alloc(512);
  h.write(name,0,100,'utf8'); h.write('0000644\0',100); h.write('0000000\0',108); h.write('0000000\0',116);
  h.write(bytes.length.toString(8).padStart(11,'0')+'\0',124); h.write('00000000000\0',136);
  h.fill(32,148,156); h.write(type,156); h.write('ustar\0',257); h.write('00',263);
  if(overrides.link)h.write(overrides.link,157,100); if(overrides.prefix)h.write(overrides.prefix,345,155);
  if(overrides.size)h.write(overrides.size,124,12); if(overrides.magic)h.write(overrides.magic,257,6);
  const sum=h.reduce((a,b)=>a+b,0); h.write(sum.toString(8).padStart(6,'0')+'\0 ',148);
  return h;
}
function tar(entries,{noEnd=false}={}){
  const chunks=[];
  for(const e of entries){const b=Buffer.isBuffer(e.text)?e.text:Buffer.from(e.text??'');chunks.push(header(e.name,b,e.type??'0',e));chunks.push(b);chunks.push(Buffer.alloc((512-b.length%512)%512));}
  if(!noEnd)chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}
const pkgEntry=()=>({name:'package/package.json',text:JSON.stringify(manifest())});
function locked(compressed){const m=manifest('2.0.0',{dist:{tarball:URL,integrity:sri(compressed)}});return {packageName:NAME,sourceVersion:'2.0.0',sourceURL:URL,sourceIntegrity:m.dist.integrity,manifest:m};}
function readArchive(entries,opts={}){const bytes=gzipSync(tar(entries));return readRegistrySource(locked(bytes),{fetchImpl:async()=>new Response(bytes),...opts});}

test('latest incompatible selects publisher old version, no source fetch or runtime claim',async()=>{
  const data=metadata([manifest(),manifest('1.0.0',{engines:{dsh:'^0.2.1-rc.1'}})]);let calls=0;
  const result=await analyze(data,{fetchImpl:async(url,opts)=>{calls++;assert.equal(url,'https://registry.npmjs.org/%40scope%2Fpkg');assert.equal(opts.redirect,'error');assert.equal(opts.credentials,'omit');return new Response(JSON.stringify(data));}});
  assert.equal(calls,1);assert.equal(result.sourceVersion,'2.0.0');assert.equal(result.sourceURL,URL);assert.equal(result.officialOption.version,'1.0.0');assert.equal(result.runtimeVerified,false);assert.equal(result.compatibility,'incompatible');assert.equal(result.manifest.name,NAME);
});
test('engines own dsh takes priority over every peer including malformed peer values',async()=>{
  const result=await analyze(metadata([manifest('2.0.0',{engines:{dsh:'^0.2.1-rc.1'},peerDependencies:{'@deepseek-ai/dsh-agent':'^9.0.0',react:42}})]));
  assert.equal(result.officialOption.version,'2.0.0');assert.equal(result.requirements.length,1);
  for(const dsh of ['',42,'invalid','workspace:*']){
    const r=await analyze(metadata([manifest('2.0.0',{engines:{dsh},peerDependencies:{'@deepseek-ai/dsh':'^0.2.1'}})]));assert.equal(r.officialOption,null);
  }
});
test('all DSH peers with prerelease semantics and exact workspace tokens; malformed fields fail closed',async()=>{
  for(const range of ['workspace:*','workspace:^','workspace:~','^0.2.1-rc.1']){
    const r=await analyze(metadata([manifest('2.0.0',{engines:{node:'>=20'},peerDependencies:{'@deepseek-ai/dsh-agent':range,'@deepseek-ai/dsh':'^0.2.1-rc.1'}})]));assert.equal(r.declaredCompatible,true,range);
  }
  for(const extra of [
    {engines:{node:'>=20'},peerDependencies:{'@deepseek-ai/dsh-agent':'workspace:^0.2.1'}},
    {engines:{},peerDependencies:{'@deepseek-ai/dsh-agent':'^0.2.1-rc.1','@deepseek-ai/dsh-tools':'^0.2.2-rc.1'}},
    {engines:[]},{engines:null},{engines:{},peerDependencies:[]},
    {engines:{},peerDependencies:{'@deepseek-ai/dsh-agent':'^0.2.1-rc.1',react:4}},
    {engines:{node:'>=20'}},
  ]){const r=await analyze(metadata([manifest('2.0.0',extra)]));assert.equal(r.officialOption,null);assert.equal(r.declaredCompatible,false);}
});
test('deprecated candidates skipped and older scan capped at 250',async()=>{
  const items=[manifest('999.0.0')];for(let i=300;i>=1;i--)items.push(manifest(`${i}.0.0`,{engines:{dsh:i===1?'^0.2.1-rc.1':'^9.0.0'}}));
  const r=await analyze(metadata(items));assert.equal(r.scannedVersions,250);assert.equal(r.officialOption,null);
  const r2=await analyze(metadata([manifest(),manifest('1.9.0',{deprecated:'obsolete',engines:{dsh:'^0.2.1-rc.1'}}),manifest('1.8.0',{engines:{dsh:'^0.2.1-rc.1'}})]));assert.equal(r2.officialOption.version,'1.8.0');
});
test('invalid package/runtime and registry response identity are rejected before inference',async()=>{
  for(const name of ['../pkg','https://evil/pkg','@scope','pkg?token=secret','@Scope/pkg','a b','a'.repeat(215)])await rejects(analyzeRegistryPackage(name,'0.2.1-rc.5',{fetchImpl:()=>{throw Error('must not fetch');}}),'invalid-package-name');
  await rejects(analyzeRegistryPackage(NAME,'main'),'invalid-runtime-version');
  await rejects(analyze({...metadata(),name:'other'}),'metadata-identity-mismatch');
  await rejects(analyze(metadata([manifest('2.0.0',{name:'other'})])),'manifest-identity-mismatch');
  const bad=metadata();bad.versions['2.0.0'].version='3.0.0';await rejects(analyze(bad),'manifest-identity-mismatch');
  await rejects(analyze(metadata([manifest()],'missing')),'invalid-latest-version');
});
test('safe public tarball URL and full supported integrity required',async()=>{
  for(const url of ['http://registry.npmjs.org/a','https://evil.example/a','https://registry.npmjs.org.evil/a','https://user:secret@registry.npmjs.org/a','https://registry.npmjs.org/a?token=secret','https://registry.npmjs.org/a#hash','file:///tmp/a','https://registry.npmjs.org\\evil/a'])await rejects(analyze(metadata([manifest('2.0.0',{dist:{tarball:url,integrity:sri(Buffer.alloc(0))}})])),'invalid-source-url');
  for(const integrity of ['sha1-abcdef','sha512-YQ==','sha256-'+'A'.repeat(64),'sha512-?'])await rejects(analyze(metadata([manifest('2.0.0',{dist:{tarball:URL,integrity}})])),'invalid-integrity');
  await rejects(analyze(metadata([manifest('2.0.0',{dist:{tarball:URL}})])),'missing-integrity');
});
test('HTTP errors/redirect/network error remain sanitized and fail closed',async()=>{
  await rejects(analyze(metadata(),{fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://evil.example/secret'}})}),'redirect-rejected');
  await rejects(analyze(metadata(),{fetchImpl:async()=>({ok:true,redirected:true,url:'https://evil.example/secret'})}),'redirect-rejected');
  await rejects(analyze(metadata(),{fetchImpl:async()=>{throw Error('secret');}}),'network-or-response-error');
  await rejects(analyze(metadata(),{fetchImpl:async()=>new Response('',{status:429})}),'rate-limited');
  await rejects(analyze(metadata(),{fetchImpl:async()=>new Response('{')}),'invalid-json');
});
test('abort/deadline includes ignored fetch and stalled body; caps content length and streaming bytes',async()=>{
  const c=new AbortController();c.abort();await rejects(analyze(metadata(),{signal:c.signal}),'aborted');
  await rejects(analyze(metadata(),{timeoutMs:5,fetchImpl:async()=>new Promise(()=>{})}),'timeout');
  await rejects(analyze(metadata(),{timeoutMs:5,fetchImpl:async()=>new Response(new ReadableStream({start(){}}))}),'timeout');
  await rejects(analyze(metadata(),{fetchImpl:async()=>new Response('',{headers:{'content-length':String(12*1024*1024+1)}})}),'response-too-large');
  await rejects(analyze(metadata(),{fetchImpl:async()=>new Response(Buffer.alloc(12*1024*1024+1))}),'response-too-large');
});
test('safe source read verifies digest and returns complete individual text preimages',async()=>{
  const r=await readArchive([pkgEntry(),{name:'package/src/index.ts',text:'export const answer = 42;'}, {name:'package/LICENSE',text:'MIT'}, {name:'package/image.png',text:Buffer.from([0,1,2])}]);
  assert.equal(r.files['src/index.ts'],'export const answer = 42;');assert.equal(Object.getPrototypeOf(r.files),Object.prototype);assert.equal(r.filesAreComplete,true);assert.equal(r.complete,false);assert.equal(r.archiveSha256.length,64);assert.equal(r.omitted[0].path,'image.png');
});
test('analysis locking, integrity mismatch and archive manifest identity guards',async()=>{
  const bytes=gzipSync(tar([pkgEntry()]));const analysis=locked(bytes);
  await rejects(readRegistrySource({...analysis,sourceURL:'https://registry.npmjs.org/other'},{fetchImpl:()=>{throw Error('must not fetch');}}),'analysis-source-mismatch');
  await rejects(readRegistrySource(analysis,{fetchImpl:async()=>new Response(Buffer.from('wrong'))}),'integrity-mismatch');
  await rejects(readArchive([{name:'package/package.json',text:JSON.stringify({name:'other',version:'2.0.0'})}]),'manifest-identity-mismatch');
  await rejects(readArchive([{name:'package/src/index.js',text:'// no manifest'}]),'archive-manifest-missing');
});
test('tar rejects traversal, absolute, Windows, links and case collisions',async()=>{
  for(const name of ['/absolute','package/../escape','package/a/../../escape','package\\evil','package/C:evil','package/a:stream','package/CON.txt','package/aux','package/COM¹.txt','package/conin$','package/a.','package/a ','package/a//b','package/./a','other/file','package/a?b'])await rejects(readArchive([pkgEntry(),{name,text:'x'}]),name.startsWith('other')?'unexpected-tar-root':'unsafe-tar-path');
  for(const type of ['1','2','x','g','L','K','3','6'])await rejects(readArchive([pkgEntry(),{name:'package/evil',type,text:'',link:type==='2'?'../../outside':undefined}]),'unsupported-tar-entry');
  await rejects(readArchive([pkgEntry(),{name:'package/src/A.js',text:'a'},{name:'package/src/a.js',text:'b'}]),'tar-path-collision');
  await rejects(readArchive([pkgEntry(),{name:'package/src',text:'a'},{name:'package/src/a.js',text:'b'}]),'tar-path-collision');
});
test('tar header checksum, size, ending and count bounds',async()=>{
  const raw=tar([pkgEntry()]);raw[0]^=1;const bytes=gzipSync(raw);await rejects(readRegistrySource(locked(bytes),{fetchImpl:async()=>new Response(bytes)}),'tar-checksum-mismatch');
  await rejects(readArchive([pkgEntry(),{name:'package/src/big.js',text:Buffer.alloc(2*1024*1024+1)}]),'tar-file-too-large');
  const many=[pkgEntry(),...Array.from({length:1000},(_,i)=>({name:`package/src/f${i}.js`,text:''}))];await rejects(readArchive(many),'too-many-tar-files');
  const noEnd=gzipSync(tar([pkgEntry()],{noEnd:true}));await rejects(readRegistrySource(locked(noEnd),{fetchImpl:async()=>new Response(noEnd)}),'invalid-tar-ending');
});
test('compressed and expanded limits stop oversized archives',async()=>{
  const bytes=Buffer.alloc(8*1024*1024+1);await rejects(readRegistrySource(locked(bytes),{fetchImpl:async()=>new Response(bytes)}),'response-too-large');
  const bomb=gzipSync(Buffer.alloc(32*1024*1024+1));await rejects(readRegistrySource(locked(bomb),{fetchImpl:async()=>new Response(bomb)}),'invalid-or-oversized-gzip');
});
test('sha256 supported and malformed gzip, non-UTF8 and binary text handled explicitly',async()=>{
  const bytes=gzipSync(tar([pkgEntry(),{name:'package/src/binary.js',text:Buffer.from([0,1])},{name:'package/src/invalid.js',text:Buffer.from([255])}]));
  const a=locked(bytes);a.sourceIntegrity='sha256-'+createHash('sha256').update(bytes).digest('base64');a.manifest.dist.integrity=a.sourceIntegrity;
  const r=await readRegistrySource(a,{fetchImpl:async()=>new Response(bytes)});assert.ok(r.omitted.some(o=>o.reason==='binary'));assert.ok(r.omitted.some(o=>o.reason==='non-utf8'));
  const bad=Buffer.from('not-gzip');await rejects(readRegistrySource(locked(bad),{fetchImpl:async()=>new Response(bad)}),'invalid-or-oversized-gzip');
});
test('tar additional ambiguous formats and directories fail safely',async()=>{
  await rejects(readArchive([pkgEntry(),{name:'package/src/a.js',prefix:'../escape',text:'x'}]),'unsafe-tar-path');
  await rejects(readArchive([pkgEntry(),{name:'package/src/a.js',link:'other',text:'x'}]),'unsupported-tar-link');
  await rejects(readArchive([pkgEntry(),{name:'package/src',type:'5',text:'bad'}]),'invalid-tar-directory');
  await rejects(readArchive([pkgEntry(),{name:'package/src/a.js',magic:'ustar ',text:'x'}]),'unsupported-tar-format');
  await rejects(readArchive([pkgEntry(),{name:'package/src/a.js',size:'99999999999',text:'x'}]),'invalid-tar-number');
  const r=await readArchive([{name:'package/',type:'5'},pkgEntry(),{name:'package/src/',type:'5'},{name:'package/src/a.js',text:'ok'}]);assert.equal(r.files['src/a.js'],'ok');
});
test('metadata requirements bounded, identity mismatch in older candidates rejected',async()=>{
  const data=metadata([manifest(),manifest('1.0.0',{name:'other',engines:{dsh:'^0.2.1-rc.1'}})]);await rejects(analyze(data),'manifest-identity-mismatch');
  const r=await analyze(metadata([manifest('2.0.0',{engines:{dsh:'x'.repeat(300)}})]));assert.equal(r.requirements[0].range.length,256);assert.equal(r.declaredCompatible,false);
  const peers=Object.fromEntries(Array.from({length:65},(_,i)=>[`@deepseek-ai/dsh-${i}`,'^0.2.1-rc.1']));const many=await analyze(metadata([manifest('2.0.0',{engines:{},peerDependencies:peers})]));assert.equal(many.compatibility,'invalid');assert.equal(many.officialOption,null);
});
test('external cancellation and source read timeout are sanitized',async()=>{
  const c=new AbortController();const pending=analyze(metadata(),{signal:c.signal,fetchImpl:async()=>{c.abort();return new Promise(()=>{});}});await rejects(pending,'aborted');
  const bytes=gzipSync(tar([pkgEntry()]));await rejects(readRegistrySource(locked(bytes),{timeoutMs:5,fetchImpl:async()=>new Promise(()=>{})}),'timeout');
  await rejects(readRegistrySource(locked(bytes),{fetchImpl:async()=>new Response('',{status:307})}),'redirect-rejected');
});
test('text selection bounded by 12 whole files and 96000 bytes; omissions explicit',async()=>{
  const entries=[pkgEntry(),...Array.from({length:14},(_,i)=>({name:`package/src/f${i}.ts`,text:'a'.repeat(10_000)}))];
  const r=await readArchive(entries);assert.ok(Object.keys(r.files).length<=12);assert.ok(r.totalBytes<=96000);assert.ok(r.omitted.some(o=>o.reason==='text-byte-limit'));assert.ok(Object.values(r.files).filter(s=>s.startsWith('aaa')).every(s=>s.length===10_000));
  const r2=await readArchive([pkgEntry(),...Array.from({length:14},(_,i)=>({name:`package/src/f${i}.js`,text:'ok'}))]);assert.equal(Object.keys(r2.files).length,12);assert.ok(r2.omitted.some(o=>o.reason==='file-count-limit'));
});
