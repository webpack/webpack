// Lazy (default): each value is a thunk () => Promise<module>
const lazyModules = import.meta.glob('./dir/*.js')
const wildcardModules = import.meta.glob('./dir/*')
const nestedModules = import.meta.glob('./pages/*/index.js')
const rootModules = import.meta.glob('/context/import-meta-glob/dir/*.js')
const lazyCjsModules = import.meta.glob('./cjs/*.js')
const eagerCjsModules = import.meta.glob('./cjs/*.js', { eager: true })
const eagerNamespaceModules = import.meta.glob('./dir/*.js', {
  eager: true,
  import: '*',
})
const explicitNodeModulesModules = import.meta.glob('./dir/node_modules/*.js', {
  eager: true,
})
const skippedExhaustiveModules = import.meta.glob(
  ['./dot/.*.js', './.foo/*.js', './dir/node_modules/**'],
  { eager: true },
)
const exhaustiveModules = import.meta.glob(
  ['./dot/.*.js', './.foo/*.js', './dir/node_modules/**'],
  { eager: true, exhaustive: true },
)
const filteredModules = import.meta.glob(['./dir/*.js', '!**/bar.js'], { eager: true })
const multiModules = import.meta.glob(['./dir/*.js', './other/*.js'], { eager: true })
const lazyMultiModules = import.meta.glob(['./dir/*.js', './other/*.js'])
const lazyDefaultModules = import.meta.glob('./dir/*.js', { import: 'default' })
const lazyNamedModules = import.meta.glob('./dir/*.js', { import: 'named' })
const templateLiteralModules = import.meta.glob(`./dir/*.js`)
import { modules as globContextFromP } from './glob-context/p/importer'
import { modules as globContextFromQ } from './glob-context/q/importer'
const braceModules = import.meta.glob('./brace/*.{js,mjs}', { eager: true })
const nestedBraceModules = import.meta.glob('./nested-brace/{a,{b,c}}/*.js', {
  eager: true,
})
const unicodeModules = import.meta.glob('./unicode/*.js', { eager: true })
const starStarDotModules = import.meta.glob('./star-star-dot/**.js', { eager: true })
const baseModules = import.meta.glob('./dir/*.js', {
  base: './base',
  eager: true,
  import: 'default',
})
const rootBaseModules = import.meta.glob('/context/import-meta-glob/dir/*.js', {
  base: '/context/import-meta-glob/base',
  eager: true,
  import: 'default',
})
const projectRootBaseModules = import.meta.glob(
  './context/import-meta-glob/dir/*.js',
  {
    base: '/',
    eager: true,
    import: 'default',
  },
)
const lazyQueryModules = import.meta.glob('./query/*.js', {
  query: '?raw',
  import: 'default',
})
const templateLiteralQueryModules = import.meta.glob('./query/*.js', {
  query: `?raw`,
  import: 'default',
})
const normalizedQueryModules = import.meta.glob('./query/*.js', {
  query: 'custom',
  import: 'default',
})
const eagerObjectQueryModules = import.meta.glob('./query/*.js', {
  query: {
    foo: 'bar',
    raw: true,
    count: 1,
  },
  eager: true,
  import: 'named',
})
const lazyObjectQueryModules = import.meta.glob('./query/*.js', {
  query: {
    a: true,
    1: 'one',
    ['two']: 2,
    [true]: 'yes',
    b: 'test',
    c: 10000,
  },
  import: 'default',
})
const lazyQueryNamespaceModules = import.meta.glob('./query/*.js', {
  query: '?raw',
  import: '*',
})
const mixedRootRelativeQueryModules = import.meta.glob(
  ['/context/import-meta-glob/query/*.js', './other/*.js'],
  {
    query: '?raw',
    import: 'default',
  },
)
const commentModules = import.meta.glob(
  './dir/*.js'
  // for test: annotation contains ")"
  /*
   * for test: annotation contains ")"
   * */
)
const objectKeyModules = Object.keys(import.meta.glob('./dir/*.js'))
const objectValueModules = Object.values(import.meta.glob('./dir/*.js', { eager: true }))
const negativeFirstModules = import.meta.glob(['!**/bar.js', './dir/*.js'], { eager: true })
const filteredDefaultModules = import.meta.glob(['./dir/*.js', '!**/bar.js'], {
  eager: true,
  import: 'default',
})
const lazyFilteredNamedModules = import.meta.glob(['./dir/*.js', '!**/bar.js'], {
  import: 'named',
})
const quotedModules = import.meta.glob("./quoted/*.js", { eager: true })
const escapeModules = import.meta.glob('./escape/**/glob.js', { eager: true })

global.__importMetaGlobSideEffects = []
import.meta.glob('./side-effect/*.js', { eager: true })

const dirKeys = ['./dir/bar.js', './dir/foo.js']
const dirAndOtherKeys = ['./dir/bar.js', './dir/foo.js', './other/baz.js']
const onlyFooKeys = ['./dir/foo.js']

const expectDirKeys = modules => expect(Object.keys(modules).sort()).toEqual(dirKeys)
const expectOnlyFooKeys = modules => expect(Object.keys(modules)).toEqual(onlyFooKeys)

it('should return a thunk for each matched file in lazy mode', async () => {
  expectDirKeys(lazyModules)

  const foo = await lazyModules['./dir/foo.js']()
  expect(foo.default).toBe('foo')
})

it('should not expose resolver alternative requests in wildcard mode', () => {
  const keys = Object.keys(wildcardModules)
  expect(keys.sort()).toEqual(dirKeys)
  expect(keys).not.toContain('./dir/foo')
  expect(keys).not.toContain('./dir/bar')
})

it('should traverse directory wildcard segments in lazy mode', async () => {
  const keys = Object.keys(nestedModules).sort()
  expect(keys).toEqual(['./pages/bar/index.js', './pages/foo/index.js'])

  const foo = await nestedModules['./pages/foo/index.js']()
  expect(foo.default).toBe('nested foo')

  const bar = await nestedModules['./pages/bar/index.js']()
  expect(bar.default).toBe('nested bar')
})

it('should resolve absolute glob patterns from the project root', async () => {
  const keys = Object.keys(rootModules).sort()
  expect(keys).toEqual([
    '/context/import-meta-glob/dir/bar.js',
    '/context/import-meta-glob/dir/foo.js',
  ])

  const foo = await rootModules['/context/import-meta-glob/dir/foo.js']()
  expect(foo.default).toBe('foo')

  const bar = await rootModules['/context/import-meta-glob/dir/bar.js']()
  expect(bar.default).toBe('bar')
})

it('should resolve CommonJS matches as dynamic import namespace objects', async () => {
  await expect(lazyCjsModules['./cjs/value.js']()).resolves.toMatchObject({
    default: { answer: 42 },
  })
  expect(eagerCjsModules['./cjs/value.js'].default.answer).toBe(42)
})

it('should expose namespace objects for star imports', () => {
  expectDirKeys(eagerNamespaceModules)
  expect(eagerNamespaceModules['./dir/foo.js'].default).toBe('foo')
  expect(eagerNamespaceModules['./dir/foo.js'].named).toBe('foo named')
})

it('should allow explicit glob roots inside node_modules', () => {
  expect(Object.keys(explicitNodeModulesModules)).toEqual([
    './dir/node_modules/hoge.js',
  ])
  expect(explicitNodeModulesModules['./dir/node_modules/hoge.js'].default).toBe(
    'hoge',
  )
})

it('should only search hidden directories and node_modules in exhaustive mode', () => {
  expect(Object.keys(skippedExhaustiveModules)).toEqual(['./dot/.hidden.js'])
  expect(skippedExhaustiveModules['./dot/.hidden.js'].default).toBe('hidden')
  expect(Object.keys(exhaustiveModules).sort()).toEqual([
    './.foo/test.js',
    './dir/node_modules/hoge.js',
    './dot/.hidden.js',
  ])
  expect(exhaustiveModules['./dot/.hidden.js'].default).toBe('hidden')
  expect(exhaustiveModules['./.foo/test.js'].default).toBe('dot folder')
  expect(exhaustiveModules['./dir/node_modules/hoge.js'].default).toBe('hoge')
})

it('should support negative patterns and import selection in glob arrays', async () => {
  expectOnlyFooKeys(filteredModules)
  expectOnlyFooKeys(negativeFirstModules)
  expect(filteredDefaultModules).toEqual({
    './dir/foo.js': 'foo',
  })
  expectOnlyFooKeys(lazyFilteredNamedModules)

  expect(filteredModules['./dir/foo.js'].default).toBe('foo')
  expect(filteredModules['./dir/bar.js']).toBeUndefined()
  expect(negativeFirstModules['./dir/foo.js'].default).toBe('foo')
  await expect(lazyFilteredNamedModules['./dir/foo.js']()).resolves.toBe('foo named')
})

it('should support multiple glob patterns in eager and lazy modes', async () => {
  expect(Object.keys(multiModules).sort()).toEqual(dirAndOtherKeys)
  expect(Object.keys(lazyMultiModules).sort()).toEqual(dirAndOtherKeys)

  expect(multiModules['./dir/foo.js'].default).toBe('foo')
  expect(multiModules['./other/baz.js'].default).toBe('baz')

  const baz = await lazyMultiModules['./other/baz.js']()
  expect(baz.default).toBe('baz')
})

it('should expose selected exports in lazy mode', async () => {
  expectDirKeys(lazyDefaultModules)
  expectDirKeys(lazyNamedModules)

  await expect(lazyDefaultModules['./dir/foo.js']()).resolves.toBe('foo')
  await expect(lazyNamedModules['./dir/bar.js']()).resolves.toBe('bar named')
})

it('should parse static template literal glob patterns', async () => {
  expectDirKeys(templateLiteralModules)
  await expect(templateLiteralModules['./dir/foo.js']()).resolves.toMatchObject({
    default: 'foo',
  })
})

it('should support brace expansion in glob patterns', () => {
  const keys = Object.keys(braceModules).sort()
  expect(keys).toEqual(['./brace/a.js', './brace/b.mjs'])
  expect(braceModules['./brace/a.js'].default).toBe('brace js')
  expect(braceModules['./brace/b.mjs'].default).toBe('brace mjs')
})

it('should expand nested brace groups in glob patterns', () => {
  expect(Object.keys(nestedBraceModules).sort()).toEqual([
    './nested-brace/a/item.js',
    './nested-brace/b/item.js',
    './nested-brace/c/item.js',
  ])
  expect(nestedBraceModules['./nested-brace/a/item.js'].default).toBe('nested-a')
  expect(nestedBraceModules['./nested-brace/b/item.js'].default).toBe('nested-b')
  expect(nestedBraceModules['./nested-brace/c/item.js'].default).toBe('nested-c')
})

it('should match non-ascii filenames', () => {
  expect(Object.keys(unicodeModules)).toEqual(['./unicode/日.js'])
  expect(unicodeModules['./unicode/日.js'].default).toBe('cjk')
})

it('should not let single-segment globs match nested directories', () => {
  expect(multiModules['./other/baz.js'].default).toBe('baz')
  expect(multiModules['./other/sub/nested.js']).toBeUndefined()
})

it('should resolve dot-slash patterns from each importer directory', () => {
  expect(globContextFromP['./local-p.js'].default).toBe('local-p')
  expect(globContextFromP['./local-q.js']).toBeUndefined()
  expect(globContextFromQ['./local-q.js'].default).toBe('local-q')
  expect(globContextFromQ['./local-p.js']).toBeUndefined()
  expect(globContextFromP['../shared/common.js'].default).toBe('common')
  expect(globContextFromQ['../shared/common.js'].default).toBe('common')
})

it('should support globstar before an extension', () => {
  const keys = Object.keys(starStarDotModules)
  expect(keys).toEqual(['./star-star-dot/a.js'])
  expect(starStarDotModules['./star-star-dot/a.js'].default).toBe('star star dot')
})

it('should resolve glob patterns and returned keys from custom base paths', () => {
  expect(baseModules).toEqual({
    './dir/bar.js': 'base bar',
    './dir/foo.js': 'base foo',
  })
  expect(rootBaseModules).toEqual({
    '../dir/bar.js': 'bar',
    '../dir/foo.js': 'foo',
  })
  expect(projectRootBaseModules).toEqual({
    './context/import-meta-glob/dir/bar.js': 'bar',
    './context/import-meta-glob/dir/foo.js': 'foo',
  })
})

it('should apply query strings to lazy glob imports without changing keys', async () => {
  expect(Object.keys(lazyQueryModules)).toEqual(['./query/foo.js'])
  expect(Object.keys(templateLiteralQueryModules)).toEqual(['./query/foo.js'])
  expect(Object.keys(normalizedQueryModules)).toEqual(['./query/foo.js'])
  await expect(lazyQueryModules['./query/foo.js']()).resolves.toBe('?raw')
  await expect(templateLiteralQueryModules['./query/foo.js']()).resolves.toBe('?raw')
  await expect(normalizedQueryModules['./query/foo.js']()).resolves.toBe('?custom')
  expect(lazyQueryModules['./query/foo.js?raw']).toBeUndefined()
  expect(normalizedQueryModules['./query/foo.js?custom']).toBeUndefined()
})

it('should apply query objects to eager glob imports', () => {
  const keys = Object.keys(eagerObjectQueryModules)
  expect(keys).toEqual(['./query/foo.js'])
  expect(eagerObjectQueryModules['./query/foo.js']).toBe(
    '?foo=bar&raw=true&count=1',
  )
})

it('should apply query objects to lazy glob imports', async () => {
  expect(Object.keys(lazyObjectQueryModules)).toEqual(['./query/foo.js'])
  await expect(lazyObjectQueryModules['./query/foo.js']()).resolves.toBe(
    '?a=true&1=one&two=2&true=yes&b=test&c=10000',
  )
})

it('should support query with namespace imports', async () => {
  expect(Object.keys(lazyQueryNamespaceModules)).toEqual(['./query/foo.js'])
  await expect(lazyQueryNamespaceModules['./query/foo.js']()).resolves.toMatchObject({
    default: '?raw',
    named: '?raw',
  })
})

it('should support mixed root and relative glob patterns with query', async () => {
  expect(Object.keys(mixedRootRelativeQueryModules).sort()).toEqual([
    './other/baz.js',
    '/context/import-meta-glob/query/foo.js',
  ])
  await expect(mixedRootRelativeQueryModules['./other/baz.js']()).resolves.toBe('baz')
  await expect(
    mixedRootRelativeQueryModules['/context/import-meta-glob/query/foo.js'](),
  ).resolves.toBe('?raw')
})

it('should parse glob calls with comments in the argument list', async () => {
  expectDirKeys(commentModules)
})

it('should work when glob results are wrapped with Object.keys and Object.values', () => {
  expect(objectKeyModules.sort()).toEqual(dirKeys)
  expect(objectValueModules.map(mod => mod.default).sort()).toEqual(['bar', 'foo'])
})

it('should handle matched paths containing single quotes', () => {
  expect(Object.keys(quotedModules)).toEqual(["./quoted/quote'.js"])
  expect(quotedModules["./quoted/quote'.js"].default).toBe('single-quote')
})

it('should handle relative glob bases inside directories with glob special characters', () => {
  const actual = Object.entries(escapeModules).reduce((acc, [key, mod]) => {
    acc[key] = mod.relative
    return acc
  }, {})
  expect(actual).toEqual({
    './escape/(parenthesis)/glob.js': {
      './mod/index.js': '(parenthesis)',
    },
    './escape/[brackets]/glob.js': {
      './mod/index.js': '[brackets]',
    },
    './escape/{curlies}/glob.js': {
      './mod/index.js': '{curlies}',
    },
  })
})

it('should execute side effects for unassigned eager glob calls', () => {
  expect(global.__importMetaGlobSideEffects).toEqual(['one', 'two'])
})

// Eager: each value is the module object directly
const eagerModules = import.meta.glob('./dir/*.js', { eager: true })
const eagerDefaultModules = import.meta.glob('./dir/*.js', {
  eager: true,
  import: 'default',
})
const eagerNamedModules = import.meta.glob('./dir/*.js', {
  eager: true,
  import: 'named',
})

it('should expose module objects directly in eager mode', () => {
  expectDirKeys(eagerModules)
  expect(eagerModules['./dir/foo.js'].default).toBe('foo')
})

it('should expose selected exports in eager mode', () => {
  expectDirKeys(eagerDefaultModules)
  expectDirKeys(eagerNamedModules)

  expect(eagerDefaultModules['./dir/foo.js']).toBe('foo')
  expect(eagerNamedModules['./dir/bar.js']).toBe('bar named')
})
