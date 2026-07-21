# JavaScript syntax parser: Structure-of-Arrays migration plan

Status: **in progress** — Phase 0 landed (see §7); Phase A next.
Scope: `lib/javascript/syntax.js` (the tuned acorn-based parser) and its single
production consumer `lib/javascript/JavascriptParser.js`.

## 1. Goal

Move the JavaScript AST from one-heap-object-per-node (AoS) to typed-array
column storage (SoA), the way `lib/css/syntax.js` and `lib/html/syntax.js`
already work, while keeping the public plugin contract (estree-shaped mutable
node objects in `JavascriptParser` hooks) intact via lazily materialized,
identity-stable facade nodes.

Expected end-state improvements (to be validated against the Phase 0 baseline):

- **Memory** — an estree object node costs ~48–112 bytes plus child arrays and
  is traced by the GC; a SoA slot costs ~30 bytes across columns and is opaque
  to the GC. Per-module peak heap during parse+walk should drop by well over
  half for the AST share, and old-space GC pause time with it.
- **CPU** — parse-time allocation churn disappears for nodes that are never
  materialized; the walker dispatches on a `Uint8Array` type id instead of a
  string `switch`, and reads `Int32Array` slots instead of polymorphic object
  properties. The prior owned-method commits (#21402, #21411, #21443, #21455,
  #21458, #21461) show each step of this kind pays measurably on
  `js-parser-unit` and the module-level benchmarks.

## 2. Where we are today

`lib/javascript/syntax.js` (`WebpackParser extends acorn.Parser`, lazy mode):

- **Already owned**: the tokenizer loop (`nextToken`, `getTokenFromCode`,
  `readString`, `readNumber`, `readWord`, `skipSpace`, comment skipping,
  `readTmplToken`, `finishToken`, `finishOp`), ~22 single-shape node classes
  (`IdentifierNode` … `RestSpreadNode`), lazy `range` via symbol slot, no
  `loc` at all (offsets + `buildLineStarts`/`positionAt`), the `Scope` class,
  destructuring-errors and prop-hash pools, word/operator caches, the
  statement fast path (var/let/const, if, return, block, expression
  statement), `parseSubscript`, `parseMaybeAssign`/`parseExprOps`/
  `parseExprAtom`, `parseObj`/`parseProperty`, `parseNew`, templates,
  `parseIdent`, `parseLiteral`, `readRegexp`, the import declaration path,
  and the in-place module→script fallback.
- **Still inherited from acorn** (constructed via acorn's
  start-empty-then-mutate nodes): functions/methods/arrows and the
  paren-vs-arrow disambiguation, classes (fields, static blocks, private
  names), the for/while/do/switch/try/throw/labeled/break/continue/with/empty/
  debugger statements, patterns (`parseBindingAtom`/`parseBindingList`,
  `toAssignable`, the `checkLVal*` family), sequences (`parseExpression`),
  `parseExprList`, property names/values, `parseYield`, export specifiers,
  and `ChainExpression` wrapping.

Consumer facts that constrain the design (verified in this investigation):

- `lib/javascript/syntax.js` has exactly one production consumer:
  `JavascriptParser` (plus two unit-test files). It exports the class, not a
  parse function; `JavascriptParser._parse` calls `parser.parse(code, opts)`
  with `lazyNodes: true`, `locations: false`.
- `JavascriptParser` hooks hand **raw nodes** to plugins: `hooks.program` /
  `hooks.finish` get the whole `Program` (tapped by 7+ built-in plugins on
  every module — `UseStrictPlugin`, `HarmonyDetectionParserPlugin`,
  `DefinePlugin`, `InnerGraphPlugin`, `SideEffectsFlagPlugin`,
  `CompatibilityPlugin`, `ConstExportsPlugin`), `hooks.statement` fires for
  **every** walked statement, `hooks.evaluate*` / `hooks.expression*` /
  `hooks.call*` etc. fire selectively (mostly name-keyed `HookMap`s, so most
  nodes never reach a tap).
- Long-lived structures do **not** retain nodes: dependencies store extracted
  `[start, end]` ranges and precomputed `loc` objects. The two escape points
  that outlive the walk are `BasicEvaluatedExpression#expression` (serves
  `.range` lazily) and the compilation-lifetime `evaluateAstCaches`
  (`WeakMap<Compilation, Map<string, Program>>`, snippet ASTs from
  `evaluate()`), capped at 4096 entries.
- webpack itself never mutates nodes after parse, but estree mutability and
  enumeration behavior (`for-in`, `Object.keys`, spread, `JSON.stringify`, generic
  estree walkers run by third-party plugins) are part of the de-facto public
  contract.
- The walker (`walkStatement`/`walkExpression`) is a frequency-ordered
  `switch (node.type)` over strings; `range`/`start`/`end` are the hottest
  field reads (`isPure`, `getLocation`, range extraction in dependency
  plugins).

The CSS and HTML parsers provide the proven template:

- **CSS** (`lib/css/syntax.js`): a dual-backend seam — every construction site
  calls module-level function slots (`_makeLeaf`, `_setValue`, …) filled by
  either an object backend (retainable `parseA*` API) or a SoA backend
  (`_soaTypes` u8, `_soaStarts`/`_soaEnds` i32, `_soaAux0..2` i32, `_soaFlags`
  u8, list spans into one `_soaFlat` i32 buffer); 1-based integer refs with
  0 = null; strings derived from source offsets on read; a single reused
  accessor object `A`; scratch-list pooling; shrink threshold (65536) with a
  one-shot regrow hint.
- **HTML** (`lib/html/syntax.js`): whole-tree columns incl.
  parent/firstChild/lastChild/nextSibling links, contiguous attribute runs,
  geometric growth from 4096 with an `input.length / 12` pre-sizing estimate,
  warm reuse across parses, oversized-column release after the walk.

The JS parser cannot copy either wholesale, for two reasons: the plugin API
requires real node objects (CSS/HTML consumers are internal and read through
`A`), and roughly half the grammar is still built by acorn code we don't own.
Hence the phased plan below.

## 3. Target architecture

### 3.1 Columns (owned by a per-parse `ParseResult`, not module-level)

Unlike CSS/HTML, buffers must not be module-level singletons: facade nodes can
legitimately outlive the parse (`evaluateAstCaches`, plugin retention), and a
dangling facade over recycled columns would be a silent-corruption bug. Each
parse allocates one `ParseResult` holding the columns; facades keep a
reference to it, so the GC frees columns exactly when the last facade dies.
Typed arrays are pointer-free, so keeping them alive is cheap to trace.

Per node (1-based id, 0 = null):

| Column      | Type       | Content                                                                                                               |
| ----------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| `types`     | Uint8Array | numeric `NodeType` enum (~70 estree types)                                                                            |
| `starts`    | Int32Array | start offset                                                                                                          |
| `ends`      | Int32Array | end offset                                                                                                            |
| `kid0..2`   | Int32Array | fixed children (`left`, `right`, `test`, …) by per-type layout                                                        |
| `aux`       | Int32Array | 4th child (`ForStatement.update`), operator id, list start, …                                                         |
| `listStart` | Int32Array | span start into `flat` for variable-length lists                                                                      |
| `listLen`   | Int32Array | span length                                                                                                           |
| `flags`     | Uint8Array | packed booleans (`computed`, `optional`, `prefix`, `async`, `generator`, `static`, `shorthand`, `method`, …) per-type |

- `flat`: one Int32Array of child ids for bodies/params/arguments/elements/
  properties/quasis (CSS's `_soaFlat`), built through pooled scratch arrays.
- Operators, `kind` values (`var`/`let`/`const`/`get`/`set`/`init`/…) and
  property kinds live in small numeric enums inside `aux`/`flags`.
- Strings are **not stored**: identifier names come from
  `input.slice(start, end)` funneled through the existing interning
  `WORD_CACHE`; literal `raw` is a slice; string/template `cooked` values are
  unescaped on demand. Rare payloads (bigint, regex pattern/flags, escaped
  identifiers where slice ≠ name, directives) go into a sparse side `Map`
  keyed by id.
- Growth: geometric doubling from 4096 with a pre-sizing estimate (measured in
  Phase 0: one node per ≈ 6–19 source bytes, ≈ len/10 on typical code — see
  Appendix A). Scratch list arrays are pooled; the columns themselves start
  out not pooled (see Phase E).

### 3.2 Facades (the estree compatibility layer)

A facade is the materialized object for one node id, created on demand and
memoized in a per-parse `facades` array so node identity is stable (plugins
key maps by node). Requirements, in priority order: correctness for
`for-in`/`Object.keys`/spread/`JSON.stringify`/mutation, then cheap `type`/
`start`/`end`/`range` reads, then lazy children (so handing `Program` to
`hooks.program` costs O(fields actually read), not O(tree)).

Candidate designs to settle in the Phase C spike, with a compat unittest
battery driving the decision:

1. **Own enumerable accessors** — `type`/`start`/`end` as plain own fields,
   children as own enumerable get/set pairs (`Object.defineProperties` from a
   per-type cached descriptor map) that read the columns and memoize into a
   symbol slot on first access. Full enumeration compat; defineProperty
   cost is paid only per materialized node.
2. **Prototype accessors** (LazyLocNode-style) — cheapest, but children are
   invisible to `Object.keys`/spread; would break generic estree walkers that
   third-party plugins may run. Only viable if (1) benchmarks unacceptably.
3. **Eager shallow materialization** — own fields with child facades created
   eagerly (children lazy one level down via (1)). Fallback if descriptor
   maps are too slow for the per-statement `hooks.statement` path.

`range` keeps today's semantics (symbol-slot memoized `[start, end]`).
`getLocation` needs only offsets and works on ids without materializing.

### 3.3 Walker

`JavascriptParser`'s walk core moves from `switch (node.type)` over facades to
a dispatch table indexed by the `Uint8Array` type id, walking ids and reading
columns through module-level accessor helpers. Facades are materialized only
at escape points: tapped hook call sites, `statementPath` (public state),
`BasicEvaluatedExpression.setExpression`, and error/diagnostic paths that
outlive the walk. Name-keyed `HookMap` lookups (identifier/member-chain
names) are computed from column reads + `WORD_CACHE` without materializing.

## 4. Step-by-step plan

Every step is a separate PR: tests first where behavior could shift, a
changeset when user-facing, `yarn benchmark --filter` numbers for
`js-parser-unit` plus at least one module-level case
(`many-modules-esm`, `lodash`, `three-long`) in the PR discussion, and
Codecov patch coverage ≥ 90%.

### Phase 0 — Baseline and guardrails (1 PR)

1. Extend `test/benchmarkCases/js-parser-unit` with a walk-only variant
   (parse once, drive `JavascriptParser` hooks over the AST repeatedly) and a
   peak-heap probe (`global.gc()` + `process.memoryUsage()` deltas around
   parse and parse+walk), so parse CPU, walk CPU and AST heap are measured
   separately.
2. Add a corpus AST-equivalence harness to `test/WebpackParser.unittest.js`:
   parse the benchmark fixtures (typescript.js, three, react, lodash,
   lodash-es) in lazy mode and with plain acorn, deep-compare normalized
   trees (type/start/end/children/values). This is the correctness gate every
   later phase re-runs; today's targeted tests don't do bulk comparison.
3. Record the nodes-per-byte ratio and node-type/list-length histograms for
   the corpus (drives column layout and pre-sizing constants).

### Phase A — Own the remaining grammar (6 PRs, immediate CPU wins)

SoA emission needs every construction site owned; acorn methods build and
mutate node objects and cannot emit into columns. Order by frequency so each
PR pays for itself (pattern of #21443/#21461). All owned methods keep the
existing gating discipline: exact acorn semantics, delegate in non-lazy mode
and when a subclass overrides a cooperating method (the `_stmtFastPath`
pattern).

- **A1 Functions & arrows** — `parseFunction`, `parseMethod`,
  `parseArrowExpression`, `parseParenAndDistinguishExpression`, function
  bodies/params, `parseYield`/`parseAwait` tails. Highest node counts after
  the already-owned expression core.
- **A2 Remaining statements** — `for`/`for-in`/`for-of` (incl. the `let`
  disambiguation), `while`/`do`, `switch`, `try`/`catch`, `throw`, labeled,
  `break`/`continue`, `empty`, `debugger`, `with`; fold into the
  `parseStatement` fast-path switch.
- **A3 Patterns & LVal** — `parseBindingAtom`/`parseBindingList`,
  `toAssignable`, `checkLVal*`; this is where post-construction re-tagging
  happens, so the accessor seam of Phase B is designed against these sites.
- **A4 Classes** — `parseClass*`, fields, static blocks, private names,
  getters/setters.
- **A5 Remaining expressions** — `parseExpression` (sequences), tagged
  templates + `ChainExpression` wrapping in `parseSubscripts`,
  `parseExprList`, `parsePropertyName`/`parsePropertyValue`, meta properties.
- **A6 Export tail** — `parseExport` specifiers/default/named paths.

Exit criteria: with lazy mode on, a corpus parse under an instrumented build
(acorn's node-constructing methods stubbed to throw) never re-enters acorn;
test262-cases, unit and integration suites green; benchmark deltas recorded
per PR. acorn remains a dependency for non-lazy mode and overridden-method
fallbacks — that support matrix is unchanged.

### Phase B — Construction/access seam (2 PRs, no behavior change)

- **B1** Funnel all owned construction through module-level emitter slots
  (`_emitIdent(start, end)`, `_emitMember(...)`, `_emitList(...)`, …) — the
  CSS `_makeLeaf`/`_setValue` pattern; object backend is the only
  implementation. Slots are module-level constants so call sites stay
  monomorphic.
- **B2** Funnel parser-internal post-construction reads/writes
  (`toAssignable` re-tags, `checkLVal` reads, destructuring-error positions,
  `parseSubscript` reading `base.type`, module-fallback checks) through
  accessor helpers (`_typeOf(ref)`, `_startOf(ref)`, `_setTypeOf(ref, t)`, …).

Exit criteria: parse methods never touch node fields directly; corpus ASTs
byte-identical to Phase A output; benchmarks flat (the seam must cost
nothing — verify, this is a regression gate).

### Phase C — SoA backend + facades (3 PRs)

- **C0 Facade spike** — implement the §3.2 candidates behind the seam for a
  handful of node types, benchmark `hooks.program`/`hooks.statement`-shaped
  access and enumeration, land the compat unittest battery (for-in, keys,
  spread, JSON.stringify, mutation, identity, `range` semantics), pick the
  design with data in the PR.
- **C1 Columns + emission** — `NodeType`/operator enums, column layout per
  §3.1, `ParseResult`, SoA emitter slots active in lazy mode, root `Program`
  facade returned from `parse()` so `JavascriptParser` and the hook contract
  are untouched. One-release escape hatch: `parse.soaAst: false` module
  option to fall back to the object backend.
- **C2 Full facade coverage** — all node types, side-payload maps, comments
  unchanged (`LazyComment` already lazy). Corpus equivalence harness now
  compares facade trees vs acorn.

Exit criteria: full suite + test262 green with SoA on; parse-phase allocation
sharply down and parse CPU neutral-or-better on `js-parser-unit`. (End-to-end
heap wins are still limited here: the walk materializes most facades until
Phase D. If C benchmarks show a regression from double bookkeeping, C and D
land behind the escape hatch and flip on together.)

### Phase D — Walker on columns (3–4 PRs, the payoff)

- **D1** Id-based walk core in `JavascriptParser`: dispatch table indexed by
  type id; `preWalk`/`blockPreWalk`/`walk` read columns; facades materialize
  only at escape points (§3.3). `statementPath` keeps materialized statements
  (public API).
- **D2** Hook boundaries: name-keyed `HookMap` resolution (identifier and
  member-chain name building, `getMemberExpressionInfo`) from column reads;
  `evaluate` path materializes only the expression subtrees it actually
  visits.
- **D3** Internal helpers on ids where profitable: `isPure`, `getComments`/
  semicolon checks, destructure-assignment scans, `enterPattern`,
  `getLocation` (offsets only).
- **D4** Instrumented materialization counter (debug-only) + benchmark pass;
  target < 30% of nodes materialized across the module benchmark corpus.

Exit criteria: end-to-end wins on module benchmarks (`many-modules-*`,
`lodash`, `three-long`, `typescript-long-on-schedule`): build CPU down, peak
heap down, GC time down; no plugin-visible behavior change (full configCases
suite is the gate, plus a canary run against webpack's own build and a large
OSS fixture).

### Phase E — Lifecycle and cleanup (2 PRs)

- **E1** Memory tuning with Phase 0 probes: pre-sizing constants from the
  measured nodes-per-byte ratio; trim-to-fit copy for `ParseResult`s retained
  past the walk (`evaluateAstCaches` snippets); pool only the scratch list
  builders (they never escape). Column pooling across parses stays **off**
  unless E1 measurements show GC churn from column allocation — if enabled it
  must be generation-checked against escaped facades.
- **E2** Docs (`JavascriptParser` hook docs note the facade contract), types
  (`yarn fix:special`), delete dead object-only paths that the support matrix
  no longer needs, changeset rollup.

## 5. Measurement protocol

For every phase-gate PR: `yarn benchmark` on `js-parser-unit` (tokenize /
parse / parse+walk / heap variants) and the module-level cases named above,
same machine, interleaved A/B runs, report median ± CI as the benchmark
harness emits them. Heap numbers from the Phase 0 probes (post-gc RSS/heap
deltas), not `--max-old-space-size` anecdotes. A phase does not merge on a
CPU or peak-heap regression in its gate benchmarks.

## 6. Risks and mitigations

| Risk                                                                                       | Mitigation                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Facade enumeration/mutation behavior breaks a third-party plugin pattern we didn't foresee | C0 compat battery grown from real plugin idioms (estree walkers, spread, JSON); escape hatch `parse.soaAst: false` for at least one minor release; canary builds                           |
| Escaped facade over recycled columns (dangling ref)                                        | Columns owned by `ParseResult`, no cross-parse reuse in the initial design; pooling later only with generation checks                                                                      |
| Owning acorn grammar forks us from upstream fixes                                          | Already-accepted cost for the owned half; keep methods as annotated exact-semantics copies of acorn 8, and re-diff against acorn releases (add a CI reminder when the acorn version bumps) |
| Double bookkeeping in Phase C regresses before Phase D pays                                | Phases C+D can ship together behind the escape hatch; per-PR benchmark gates                                                                                                               |
| Walk rewrite (Phase D) destabilizes dependency extraction                                  | Corpus equivalence harness at the hook level: record hook call sequences + arguments (type/range) before/after and diff; full integration suite                                            |
| `Uint8` type enum drifts from string `type` values                                         | Single generated table mapping enum ↔ string, used by both emitter and facades; unittest asserts bijection                                                                                 |

## 7. Phase 0 status and baseline (measured)

Landed in this branch:

- Corpus AST-equivalence harness — `test/WebpackParser.unittest.js`,
  `describe("corpus equivalence")`: deep-compares lazy-mode output (nodes and
  comments) against plain acorn over typescript.js, three.module(.min).js,
  react, react-dom, lodash and lodash-es. Green at baseline; this is the
  correctness gate every later phase re-runs.
- Walk-only benchmarks — `test/benchmarkCases/js-parser-unit`, `mode 'walk'`
  variants (typescript, three.module.js, lodash.js): pre-parse once, measure
  `JavascriptParser`'s hooks+walk in isolation. Heap tracking for benches is
  covered by the harness's CodSpeed memory runner mode; the retained-AST
  numbers below were measured directly (fresh process per fixture, warm-up
  parse, `global.gc()` before/after holding the AST).

Baseline numbers (Node 22, x64 Linux, this container — re-measure relative
deltas on the same machine, not against these absolutes):

| Fixture             | Source  | Nodes   | Source bytes/node | Retained AST | AST bytes/node |
| ------------------- | ------- | ------- | ----------------- | ------------ | -------------- |
| typescript.js       | 8.72 MB | 949,463 | 9.6               | 93.1 MB      | 102.8          |
| three.module.js     | 0.62 MB | 60,698  | 10.7              | 5.8 MB       | 100.2          |
| three.module.min.js | 0.35 MB | 57,011  | 6.4               | 5.3 MB       | 98.1           |
| lodash.js           | 0.52 MB | 29,590  | 18.5              | 2.8 MB       | 98.8           |

Shape statistics (typescript.js; other fixtures agree within a few points):

- Identifier 43.1%, MemberExpression 8.5%, Literal 8.0%, CallExpression 7.8%
  — the four hottest types cover ~67% of all nodes.
- Fixed (non-list) node children: max 4; only 377 of 949k nodes (0.04%) carry
  a 4th fixed child (`ForStatement`) — `kid0..2` columns with an `aux`
  overflow slot is the right layout.
- Array-valued fields: 0.18 per node, 0.34 elements per node — one shared
  `flat` buffer stays small relative to the node count.
- String-valued fields: 0.66 per node, dominated by identifier `name` and
  literal `raw` — confirming derive-from-source-offsets as the primary string
  strategy.
- The retained object AST costs ~100 bytes/node on every fixture (~10× the
  source size). The §3.1 column layout costs ~32 bytes/node → target ≈ 3×
  AST-heap reduction before any facade savings.
- Single-pass walk vs parse (typescript.js): walk ≈ 366 ms, parse ≈ 491 ms —
  the walker is worth nearly as much CPU as the parse, justifying Phase D.

## 8. Non-goals

- No change to the non-lazy mode (direct `WebpackParser` users, plugin
  subclasses overriding parse methods) — it keeps acorn object nodes.
- No public accessor-path API (CSS-style `A`) for JS plugins in this effort;
  that is a possible webpack 6 evolution once the SoA backend is proven.
- No tokenizer SoA: the tokenizer already runs on a single mutable token with
  table-driven dispatch; there is no token buffer to convert.
