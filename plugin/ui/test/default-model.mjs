/** 默认模型回归：执行 TS 真源中的 semantic stream 段，避免 lib 尚未构建时漏测。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8')
const semantic = source.slice(source.indexOf("case 'search:semantic':"))
const start = semantic.indexOf("let text = ''")
const end = semantic.indexOf('const picks = parsePicks(text)', start)
assert.ok(start >= 0 && end > start, 'semantic stream source segment must exist')
const code = ts.transpileModule(
  `(async () => { ${semantic.slice(start, end)}; return text })()`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
).outputText

const requests = []
const errors = []
let selection = { provider: 'provider-a', model: 'model-a', reasoningEffort: 'high' }
let service = { currentSelection: () => ({ ...selection }) }
const ctx = { get(name) { assert.equal(name, 'agentDefaultModel'); return service } }
const llm = {
  async *stream(request) {
    requests.push(request)
    yield { text: 'answer' }
  },
}
const run = () => runInNewContext(code, {
  ctx, llm, prompt: 'query', console: { error: (...args) => errors.push(args) },
})

assert.equal(await run(), 'answer')
assert.equal(requests[0].provider, 'provider-a')
assert.equal(requests[0].model, 'model-a')
assert.equal(requests[0].reasoningEffort, 'high')
assert.equal(requests[0].messages[0].content[0].text, 'query')
selection = { provider: 'provider-b', model: 'model-b' }
assert.equal(await run(), 'answer')
assert.equal(requests[1].provider, 'provider-b', 'must reread defaults on every request')
assert.equal(requests[1].model, 'model-b')
assert.equal(requests[1].reasoningEffort, undefined)
service = undefined
assert.equal(await run(), '', 'missing service preserves existing lexical-search fallback')
service = { currentSelection: () => ({ provider: '', model: '' }) }
assert.equal(await run(), '')
service = { currentSelection() { throw new Error('unavailable') } }
assert.equal(await run(), '')
assert.equal(requests.length, 2, 'missing defaults must never call an arbitrary model')
assert.equal(errors.length, 3)
console.log('default model source regression passed')
