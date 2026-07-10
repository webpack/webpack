// Behaviors ported from other bundlers' import.meta.glob / glob-import suites:
//   Vite      - playground/glob-import + src/node/__tests__/plugins/importGlob
//   Turbopack - turbopack-tests/.../resolving/import-meta-glob
//   Rspack    - tests/rspack-test/normalCases/context/import-meta-glob
// Each case exercises a behavior not already covered by ../import-meta-glob.

// Vite/Turbopack/Rspack all return keys sorted by request; assert the raw
// order is already sorted, without the test applying its own .sort().
const orderModules = import.meta.glob('./order/*.js', { eager: true })

// Overlapping patterns must expose a matched file under a single key.
const dedupeModules = import.meta.glob(['./dedupe/*.js', './dedupe/one.js'], {
  eager: true,
})

// Vite #22170: sibling dirs sharing a name prefix (foo vs foobar) must not be
// merged/pruned by the common-base scan.
const prefixModules = import.meta.glob(
  ['./pfx/foo/*.js', './pfx/foobar/*.js'],
  { eager: true },
)

// `**` crosses multiple directory levels and also matches a top-level file.
const deepModules = import.meta.glob('./deep/**/*.js', { eager: true })

// Negating every match yields an empty object (not an error) when the base
// directory exists (Vite: empty match set -> {}).
const emptyModules = import.meta.glob(['./order/*.js', '!./order/**'], {
  eager: true,
})

import { modules as selfModules, withoutSelf } from './self/importer'

it('returns keys already sorted by request (Vite/Turbopack/Rspack parity)', () => {
  expect(Object.keys(orderModules)).toEqual([
    './order/a.js',
    './order/b.js',
    './order/c.js',
    './order/d.js',
  ])
})

it('dedupes a file matched by overlapping patterns', () => {
  expect(Object.keys(dedupeModules)).toEqual([
    './dedupe/one.js',
    './dedupe/two.js',
  ])
  expect(dedupeModules['./dedupe/one.js'].default).toBe('one')
})

it('does not merge sibling directories sharing a name prefix (Vite #22170)', () => {
  expect(Object.keys(prefixModules).sort()).toEqual([
    './pfx/foo/one.js',
    './pfx/foobar/two.js',
  ])
  expect(prefixModules['./pfx/foo/one.js'].default).toBe('foo-one')
  expect(prefixModules['./pfx/foobar/two.js'].default).toBe('foobar-two')
})

it('matches ** across multiple directory levels', () => {
  expect(Object.keys(deepModules).sort()).toEqual([
    './deep/a/b/c/leaf.js',
    './deep/top.js',
  ])
  expect(deepModules['./deep/a/b/c/leaf.js'].default).toBe('leaf')
  expect(deepModules['./deep/top.js'].default).toBe('shallow')
})

it('returns an empty object when every match is negated', () => {
  expect(emptyModules).toEqual({})
})

// Divergence: being ContextModule-based, webpack includes the importing
// module itself (like Turbopack, which negates `!./index.js` in its own test);
// Vite auto-excludes it. Exclude it explicitly with a negative pattern.
it('includes the importer in ./*.js, excludable via negation (Turbopack parity)', () => {
  expect(Object.keys(selfModules).sort()).toEqual([
    './importer.js',
    './sibling.js',
  ])
  expect(Object.keys(withoutSelf)).toEqual(['./sibling.js'])
  expect(withoutSelf['./sibling.js'].default).toBe('sibling')
})
