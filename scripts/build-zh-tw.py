"""Build presentation data from pinned opencc-python-reimplemented 0.1.7.
Usage: bundled-python scripts/build-zh-tw.py <directory containing opencc>
Build-only dependency, never installed or executed by the plugin.
"""
from pathlib import Path
import sys, json, re
root=Path(__file__).resolve().parents[1]
tools=Path(sys.argv[1]).resolve();sys.path.insert(0,str(tools))
from opencc import OpenCC
cc=OpenCC('s2twp')
keys=set()
for name in ['STCharacters','STPhrases','TWPhrases','TWVariants']:
    for line in (tools/'opencc/dictionary'/f'{name}.txt').read_text(encoding='utf-8').splitlines():
        key=line.split('\t')[0]
        if re.fullmatch(r'[\u3400-\u9fff]+',key):keys.add(key)
source=(root/'lib/client-tasks.js').read_text(encoding='utf-8')
source=re.sub(r'// BEGIN ZH-TW PRESENTATION.*?// END ZH-TW PRESENTATION','',source,flags=re.S)
keys.update(re.findall(r'[\u3400-\u9fff]+',source))
chars={key:cc.convert(key) for key in sorted(keys) if len(key)==1}
phrases={key:cc.convert(key) for key in sorted(keys) if len(key)>1}
header='// Generated OpenCC-derived s2twp display dictionary; Apache-2.0. See licenses/OPENCC-NOTICE.txt.\n'
(root/'lib/zh-tw-data.js').write_text(header+'const ZH_TW_CHARS = '+json.dumps(chars,ensure_ascii=False,separators=(',',':'))+';\nconst ZH_TW_PHRASES = '+json.dumps(phrases,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
(root/'licenses').mkdir(exist_ok=True)
(root/'licenses/OPENCC-LICENSE.txt').write_bytes((tools/'opencc_python_reimplemented-0.1.7.dist-info/LICENSE.txt').read_bytes())
(root/'licenses/OPENCC-NOTICE.txt').write_bytes((tools/'opencc/NOTICE.txt').read_bytes())
print(f'Generated {len(chars)} characters and {len(phrases)} phrases; copied upstream license and notice.')
