# JavaScript compressor on `SyntaxTree` columns

<!-- Plan for a long-lived branch; folded into docs/syntax.md once it merges. -->

The minifier's default path (`compress` and `mangle`, what `jsMinify` runs) parses into a `SyntaxTree`, adopts it into terser-shaped objects, then compresses, mangles and prints those objects. The compressor is most of the time:

| three.module.js, default `minify` | ms per run |
| --------------------------------- | ---------: |
| total                             |        546 |
| optimizer (`transformNode`)       |       ~370 |
| reduce_vars                       |         29 |
| scope analysis, program-wide      |          9 |
| garbage collection                |         50 |

Peak RSS is 294 MB, against 143 MB with compression off. The CPU profile is flat (the top function is 2.6%), so no single function carries the port: the data layout does.

## Why columns

The same post-order walk with ten optimizer-style checks, over the adopted objects and over the `SyntaxTree` columns (a throwaway prototype; callgrind, estimated cycles = Ir + 10 × L1 misses + 100 × LL misses, per walk):

| file            | objects | columns |
| --------------- | ------: | ------: |
| lodash.js       |   16.9M |    8.6M |
| three.module.js |   32.7M |   17.4M |

The objects' field loads see every node shape and go megamorphic, and miss L1 5–7× as often. The mangler's own scope analysis shows the same: 5.9 ms on columns (`analyzeMinifierTree`) against 11.2 ms on objects for three.module.js. This is the upper end for traversal-bound work; logic-heavy parts (`evaluate`, side effects) gain less.

## Constraints

- Output stays byte for byte what it is: `yarn test:minify-corpora` and the printer unit tests pass at every commit.
- The optimizer pass switches representation as a whole: keeping objects and columns in sync costs more than columns save. So the port is done on this branch, and merges to `main` only once the switched branch beats `main` under callgrind on lodash and three; commits before the switch may be slower.
- `format.ast`, a tree passed in and `parse.spidermonkey` keep working: objects are built only where a caller asks for them.

## Steps

Each step names its check.

1. **Node API over objects.** One accessor per field the compressor reads or writes (`NodeFields` in `syntax-printer.js`: a getter and a setter each, `kindBitsOf(key, node)` for the symbol-keyed kind bits, list access), backed by the objects. → output byte-identical, CPU measured (expected slower: one load site per field).
2. **Mechanical rewrite.** A TypeScript-checker rewrite of every `NodeFields` property read and write on a `Node`-typed expression into the API, one install area at a time (`installReduce`, `installEvaluate`, … , `installImprove`); `.name`, `.value` and `.operator` on definitions and tokens are left alone by type. → `lint:types`, printer tests and minify-corpora per area.
3. **Lists, creation, walks.** In-place list edits (`push`, `splice`, assigned arrays) go through the API; `makeNode` keeps its signature; `walk`, `transformNode` and the descend tables read children through the API. → same checks.
4. **Scope analysis.** The compressor's analysis (`CompressorScopeAnalyzer`) reads through the API too, or extends `MinifierTreeScopeAnalyzer`. → same checks.
5. **Switch.** The API's backing becomes the `SyntaxTree`: children in its slots, per-node compressor state (`definition`, `scope`, `fixed`, flags, annotations) in side columns by node id, the terser kind in a column, new nodes appended. Adoption leaves the compress path. → byte-identical, then callgrind against `main`.
6. **Downstream.** Mangle with `mangleTree` and print from the columns, nodes the compressor made printed from their values rather than source slices. → same.
7. **Tune and merge.** Hot accessors specialized, lists read without materializing arrays, columns released after each pass. → callgrind and peak RSS against `main`, then a PR.
