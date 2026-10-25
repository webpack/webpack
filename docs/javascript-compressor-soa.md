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
3. **Kind tables, walks.** Reads of what a node's kind holds (`node[KIND_BITS]`, `SIZE_OF`, the traversal and descend tables) go through `Nodes.ofKind`, a field chosen at run time through `Nodes.get` / `Nodes.set` / `Nodes.fieldsOf`, and the generated descend functions read children through the API. Lists stay arrays a field holds. → same checks.
4. **Everything reading a compressed tree.** The object printer (`installEstreePrint`), the mangler (`installEstreeMangle`, `createPropertyMangler`), the driver and the compressor's scope analysis in `ScopeAnalyzer.js` (`MinifierScopeAnalyzer`, `CompressorScopeAnalyzer`, through their dialect) read through the API too. The compressor's tree keeps its own shape — a template's `segments`, an import's `imported_names`, an export's `exported_*` — which differs from the parser's `SyntaxTree` in about ten types, so the column printer and mangler cannot read it as is. → same checks.
5. **Switch.** The API's backing becomes columns in the compressor's own layout (`NODE_TYPE_FIELDS` per kind): a kind column, each kind's record in slots, per-node state (`definition`, `scope`, `fixed`, flags, annotations, tokens) in side columns by node id, lists as arrays, new nodes appended. Adoption writes these columns instead of objects; factories, predicates, `copyNode` and the kind tables read the kind column. Objects are built only for `format.ast` and a tree passed in. → byte-identical, then callgrind against `main`.
6. **Downstream.** With everything reading through the API, printing and mangling run on the columns unchanged; later, nodes copied verbatim print from their source slices as the node printer does. → same.
7. **Tune and merge.** Hot accessors specialized, lists read without materializing arrays, columns released after each pass. → callgrind and peak RSS against `main`, then a PR.
