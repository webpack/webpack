# JavaScript syntax parser: Structure-of-Arrays migration plan

Status: **in progress — SoA is the default backend; Phase C3
(grammar flows ids) is complete: the whole grammar, statements and the
Program included, flows raw refs.** Landed so far, in order (details in §4/§7): Phase 0 baselines;
**Phase A complete** (A1–A6: every grammar construction owned in lazy
mode, no acorn node-construction path remains reachable); **B1** (all 44
single-shape constructions route through module-level `_emit*` slots,
verified zero-cost) with B2's `_retag` seam keeping the column type
authoritative through `toAssignable`; **C1** (full facade coverage for
every reachable estree type, SoA arm behind the `soaAst` parse option,
corpus-equivalence-gated); **D** (id-based walker and pre-walks
dispatching on column types, lazy `statementPath`, lazy facade
construction — facades register only for state the columns cannot
rebuild); the **default flip** — `soaAst` is a `JavascriptParserOptions`
option defaulting to `true`, `module.parser.javascript.soaAst: false` is
the escape hatch, the eslint-scope consumers keep object ASTs pinned —
measured wall-neutral at −23% end-of-build heap on the 86-module dev
build; **C2 slices 1–7** (directive flags + name memoization,
column-native call/assignment/declarator/detectMode handlers,
rename-inert types with unary/binary gating, column-native function scope
entry, info-full member-chain hook gates, the column-native CommonJS
`this` scan, and the rename-inert Call/New/Logical/Conditional extension
plus the tighter column trim), taking walk materialization to 6.4% of
nodes on typescript.js, 7.2% on lodash and 17.7% on react; and **C3
slices 1–4** — the grammar now flows raw refs (numbers) end to end:
every expression, pattern, function and statement emitter allocates a
row and returns its id with no transient facade at all, the Program is
itself a store row served by a lazy-body `ProgramFacade`, foreign
import/export/class statements are adopted onto rows so ESM top levels
stay in the columns, and `JavascriptParser.parse` drives all four
passes (module pre-walk included) off the root id. typescript.js
retained is 53.6 vs 94.6 MB (−43%), and the bare parse+walk SoA wall
gap — ~115 ms two slices ago, ~35 ms after slice 3 — is now within
noise (≈ 1%, ~555 vs ~548 ms).
C4 (profile-led follow-ups on real builds) is underway: slice 1
cut the three-long production gap from a locally reproduced +17% to
+3-8% via a single backing buffer for the store columns and a
column-native member-root descent. **C5 slice 1 (column gates)**
attacked the full-build main-vs-branch gap the first popular-library
sweep exposed (typescript +20% CPU / +17% peak RSS, three-long +10%,
lodash +7%): core plugins now pair their `statement` /
`preDeclarator` / `declarator` / `statementIf` /
`expressionLogical|ConditionalOperator` / `collectGuards` taps with
column gates (`parser.registerColumnGate`) encoding their own bail
conditions, so the id walk skips both facade materialization and the
hook call when every tap is gated off — lodash is now neutral
(−0.9%), three-long ≈ +5-6%, typescript ≈ +15% CPU with peak RSS down
to +5.7% (−32 MB). **C5 slice 2** removed the post-parse `trim()` copy
for transient production stores and stopped materializing owner
facades to probe absent child slots: typescript −8% wall with peak
RSS below main, lodash faster than main (−4%). CodSpeed's
Memory rows flagging the parser unit benchmarks are the inherent
accounting difference (one upfront column allocation registers as a
large TypedArray allocation; the object backend's per-node churn is
invisible to that counter — measured live memory favors SoA on every
fixture) and await maintainer acknowledgment on the CodSpeed dashboard.
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

## 4.1 C0 facade spike — verdict (measured)

Synthetic 700k-node column store shaped like typescript.js (statement >
call > member > identifiers), 100k statements, Node 22:

| Candidate                           | materialize ALL | program-hook shape | 10M scalar reads | retained (all) | estree enumeration                     |
| ----------------------------------- | --------------- | ------------------ | ---------------- | -------------- | -------------------------------------- |
| plain nodes (today)                 | 33.7 ms         | free               | 22 ms            | 48.1 MB        | full                                   |
| 1 — own accessors, defineProperties | 697 ms (20×)    | 76 ms              | 22 ms            | 64 MB          | **full**                               |
| 1b — accessors in object literals   | 520 ms          | 92 ms              | 205 ms           | 384 MB         | full, but dictionary-mode objects      |
| 2 — prototype accessors             | 94 ms (2.8×)    | **5.4 ms**         | 21 ms            | **40.4 MB**    | children invisible to keys/spread/JSON |
| 3 — eager plain fields              | 63 ms (1.9×)    | O(tree)            | 22 ms            | 53.4 MB        | full                                   |

Columns alone: 17.8 MB ≈ 25 B/node (validates the §3.1 estimate).

**Verdict:** tiered. Default facade = **candidate 2** (prototype accessors,
class per type): materialization 2.8× a plain node but only for nodes that
reach a tap, `hooks.program`/`hooks.statement` hand-outs nearly free, scalar
reads at parity, and even worst-case full materialization retains less than
today's plain AST. Its one compat cut — children invisible to
`Object.keys`/spread/`for-in`/`JSON.stringify` — is served by **candidate 1**
(defineProperties) as an opt-in full-enumeration mode, and by the existing
`parse.soaAst: false` object-backend escape hatch. Candidate 1b (accessor
object literals) is rejected outright: V8 gives such literals
dictionary-mode shapes (11× slower reads, 8× memory). Candidate 3 remains
the bound for eager consumers. C1 proceeds with candidate 2 as the default
facade builder; the compat battery from the spike lands with C1's facades and
canary builds decide whether the enumeration cut is acceptable ecosystem-wide.

**C1 scaffolding landed** (inside `syntax.js`, like the CSS/HTML SoA
backends live in their own `syntax.js`): the per-parse `SoaAst` column store
(growth, flat child lists — now with `kid2`/`aux` columns, the shared
operator/kind tables and sparse literal values — identity-stable candidate-2
facades), exported for the compat battery in
`test/WebpackParser.unittest.js`.

**C1 facade coverage complete**: every estree type the lazy parser can
produce has a numeric type and facade — expression core, functions,
objects, patterns, classes, templates, all statements and the module
declarations. `ParenthesizedExpression` (`preserveParens` only) stays
object-backed. Layout notes: `TemplateLiteral` interleaves `quasis`/
`expressions` into one flat span (`2n + 1` entries); non-empty
import/export `attributes` live in the sparse side list behind a
`FLAG_ES2025` presence bit (mirroring acorn's ecmaVersion ≥ 16 field).

**C1 seam flip landed (opt-in)**: a `soaAst: true` parse option (lazy mode
only) installs a per-parse `SoaAst` into a module-level slot; all 44
`_emit*` emitters then fill columns and return registered facades. Owned
children wire by ref; foreign children (acorn-built nodes from
not-yet-owned sites: classes, import/export declarations, tagged
templates, meta properties, `copyNode` copies) memoize onto the facade —
mixed trees are fully supported, which also serves rare shapes (pre-ES2018
`for-of` keeps the object backend). Escaped identifier names land in the
side list (escapes always cook shorter, so a length check detects them);
`regex`/`bigint` payloads arrive as plain post-construction writes and
live as own facade fields. Born-unfinished nodes (`Property`,
`SwitchCase`) mirror their object-backend shapes and are filled in place
through facade setters. Gate: the corpus equivalence harness runs every
fixture through both backends (facade-aware comparison — children served
from prototype getters are checked via `in` + value reads; strictness for
plain nodes unchanged), all green. The seam's added `_soaStore === null`
check is flat on the object backend (interleaved A/B on typescript.js).
SoA parse currently costs ~65% more wall time than the object backend on
typescript.js — the anticipated C-phase double bookkeeping (columns +
eager facades + megamorphic facade construction at the generic emit
helper), which is why the backend stays **off by default** per the §4
contingency: it flips on with Phase D (id-walking makes facade
construction lazy for real) once the end-to-end wins materialize.
**D1 gate landed**: `JavascriptParser` accepts a `soaAst` parser option
(internal, off by default, reset per parse through the reused options
object) and a hook-sequence equivalence harness in
`test/JavascriptParser.unittest.js` records every walk-driven hook
(program/finish/statement/statementIf/importCall/topLevelAwait plus the
name-keyed expression/call/new/member-chain maps tapped for every
harvested name) and asserts the facade walk drives byte-identical
sequences to the object walk — green at baseline over a grammar-complete
sample, react and lodash. This is the gate every D1 walker-conversion PR
re-runs.
**D1 walk core landed (statement + function + leaf-expression clusters,
identifier name resolution)**: the walk pass now dispatches on the numeric
column type. `syntax.js` exports the facade→store/id symbol keys and the
`TYPE` name→id table; `JavascriptParser` extracts each statement switch
into a shared `_dispatch*Statement` (object walker and id-walk fallback
both use it) and adds an id-based walk core (`_walk*Id`). acorn always
builds the root `Program` as an object, so the walk is entered from the
body array (`_walkStatementsIdList`): SoA facades id-walk, foreign
top-level nodes (import/export/class) fall back to the object walker.
Converted to id-native, recursing on child ids: block, expression-
statement, return/throw, if, while, do-while, empty/debugger, and —
critically for the walk to descend into real code —
function/function-expression/arrow bodies (params/patterns stay on the
object walker, the block body id-walks). Leaf expressions with no
unconditional broadcast hook (literal, array, spread, update, await) plus
`Identifier` (name resolved from the columns via the source slice or the
escaped-name side value, so a tap-less identifier never materializes) are
id-native; every other expression type materializes and hands off to the
object walker. Foreign (acorn-built) subtrees sit at ref 0 with the node
memoized on the parent facade, and a list a foreign element pinned onto
its facade falls back to the object list walker. Coverage: the
`test/JavascriptParser.unittest.js` equivalence harness gains a
function-wrapped descent fixture (every id-native handler reached as a
direct child of an id-native statement), an await fixture, and focused
`soaAst`-on batteries for the plugin-return `if` branches, the
`terminate`-hook path, strict-mode-in-module-output diagnostics and the
statement-hook bail — all asserting byte-identical id/object sequences.
Both parser unittest suites and the corpus equivalence stay green.
**D2 expression cluster landed**: the id walk now dispatches the remaining
SoA-backed expression types — member, call (incl. IIFE detection,
`callMemberChain`/`call` on the evaluated callee, `import().then`), new,
binary/logical, conditional (guarded branches), assignment, unary
(`typeof`/`delete`), sequence (statement-level splitting), object/property
(shorthand + computed keys + spread), template literal (interleaved
`expressions`), chain and yield. Member/call chain analysis
(`getMemberExpressionInfo`, name-keyed `HookMap` resolution) runs on the
materialized facade at the hook boundary — an escape point — while the
operand/argument/property descent reads child ids from the columns via a
shared `_walkExprChildId` / `_walkExprListId` (foreign-pinned children and
lists fall back to the object walker off the facade, as in D1). Since C1
still constructs a facade per node eagerly in `_soaAlloc`, walk-side
materialization is not yet observable in heap; this slice is the structural
consumer half, ready for the producer to stop eager-building facades (the
Phase B2/C follow-up that turns the id walk into an actual heap win).
Tagged templates and meta properties stay acorn-built (foreign), so they
remain on the object walker until their emit sites are owned. Coverage: a
grammar-broad D2 fixture drives every new id-native handler as a direct
child of an id-native statement, plus react/lodash; all assert
byte-identical id/object hook sequences.
**Facade-shape + column-slack slice landed (heap snapshots, lodash, Node
22 — no pointer compression in release builds, so 8 B/slot)**: facades sit
in fast-properties mode at 72–104 B shallow — the earlier ~130 B/facade
estimate folded in side allocations. The measured SoA-on overheads were
(a) per-instance PropertyArray spill: memo writes land after construction,
past slack-tracking finalization, so every memoized facade grew an
out-of-object store plus shape transitions mid-walk (~0.5 MB); and (b)
column pre-size slack: the ÷10 nodes-per-source-byte heuristic
over-allocates ~2× on comment-heavy sources (~0.9 MB). Fixes: every facade
class pre-declares exactly the memo slots its accessors use in its
constructor (one stable shape per class, memos in-object — byte-neutral,
transition/GC churn gone) and `SoaAst.trim()` snugs columns to the final
count after the parse stops growing them (36 B/node retained, matching
the layout). Wall time unchanged. Identifier `name` strings remain the
last eager side allocation (~0.3 MB duplicated tokenizer slices) — fold
into the lazy-facade flip.
**D3 statement tail landed**: the id walk now dispatches every remaining
SoA-backed statement type — for (expression and acorn-built declaration
inits), for-in/for-of (declaration or pattern left), switch (discriminant
and per-case tests id-native; born-unfinished `SwitchCase.consequent` is
facade-filled, never a column span, so case bodies stay on the object list
walker), try/catch/finally (mirroring the terminated-state merge; catch
params stay on the object walker like all patterns), labeled statements
(label hook keyed by the column-derived name), `with`, and explicit no-op
break/continue. For-head declarations are acorn-built (`parseForStatement`
finishes the node itself), so they walk off the facade; dead-defensive
fallbacks for shapes the emitters cannot produce (foreign declarators,
column-backed case consequents) were dropped rather than left uncovered.
The statement-id dispatch `default` now only serves future foreign-typed
entries. Coverage: a D3 grammar fixture (both top level and inside an
id-walked function), plus battery cases for the label-hook bail, the
declaration rename/declarator-hook paths, terminate merges across
try/catch/finally shapes, and the `with` strict-module report.
**D4 scouting (measured)**: a call-site-attributed materialization probe
(facade table wiped at the program hook, `nodeAt` wrapped) puts walk-time
materialization at 82–86% of nodes across react/lodash/three. The
buckets: member-chain analysis via `getMemberExpressionRoot` (12–27%,
dominant on ESM), object-walker delegation for IIFE bodies (dominant on
CJS factory bundles — one delegation forfeited the id walk for the whole
module body), the object-based pre-walk passes (~25–33% summed), and the
per-statement facade for `statementPath`/hook broadcast (~10%). ~4–5% of
facades cannot be rebuilt from columns (born-unfinished fills,
regex/bigint payloads, pinned foreign children) and must stay eager or
move payloads to the side list before the lazy flip.
**D4 central re-entry seam landed**: `walkStatement`/`walkExpression`
re-enter the id walk when handed an SoA facade (the object `walkExpression`
switch moved to `_dispatchWalkExpression`, which the id walk's fallback
calls directly to avoid re-entering the seam). This removed the
object-walker delegation bucket entirely — CJS IIFE bodies now id-walk end
to end — with wall time flat and the symbol-miss check flat on the object
backend. The materialization total is unchanged for now because the id
handlers still materialize at hook boundaries; the next slices make those
column-native: chain-name probing without `getMemberExpressionRoot`
(materialize only when a name-keyed hook has taps), then id-based
pre-walks, then a lazy `statementPath`.
**D4 column-native chain probing landed**: `_walkMemberExpressionId` runs a
column-native twin of the `getMemberExpressionRoot` descent
(`_soaMemberChainHasNoInfo`) and descends without materializing whenever
`getMemberExpressionInfo` is provably `undefined` — chains rooted at
defined plain locals, dynamic-named members, and non-resolvable owned
roots. Foreign links, static template members and call/meta-resolvable
roots keep the facade path, so hook-visible behavior is untouched.
`_walkCallExpressionId` hoists the defined-plain-callee fast path above
facade construction (pure column reads under the existing
`_evalIdentOwnTaps` guard), so `f(x)` on locals — the dominant call shape
inside factory-wrapped bundles — never materializes the call. Measured
walk-time materialization: react 82→69%, lodash 86→71%, wall time flat.
Remaining buckets: the object-based pre-walks (~25–30%), per-statement
facades for `statementPath` (~10–13%), and free-rooted chains (hook-
relevant, irreducible).
**D4 id-based pre-walks landed**: `preWalkStatement`/`blockPreWalkStatement`
re-enter `_preWalkStatementId`/`_blockPreWalkStatementId`, which dispatch on
the column type and descend on child ids; declarator scanning
(`_preWalkVariableDeclarationId`) resolves plain identifier bindings from
the columns and materializes the identifier only when a name-keyed
pattern/var-declaration hook fires, and destructuring collection probes the
assignment's left type from the columns. Foreign shapes (for-head and
`using` declarations, pinned lists, born-unfinished switch consequents,
anonymous default exports, tagged-template statements) keep the object path
per statement. Statement facades are still materialized for `statementPath`
parity, so the pre-walk bucket largely re-bills to that: totals moved
react 69→68%, lodash 71→68%, three.module →66%, wall time flat. The
`statementPath` bucket (`_preWalkStatementId` now ~21% on lodash) is the
next slice; walk-side declarator analysis (~17%) and free-rooted chain
resolution (~11%) follow.
**D4 lazy `statementPath` landed**: the id walk and pre-walks push the
column id onto the (now internal) `_statementPath` instead of a facade;
the public `statementPath`/`prevStatement` became accessors that
materialize pending ids in place on access (`nodeAt` is identity-stable,
so late materialization is invisible to plugins), with
`_statementPathTail()` serving the identity-compared sequence/ASI reads.
Per-statement hooks (statement, pre/blockPre + typed via
`SoaAst.TYPE_NAMES`, statementIf, collectGuards, terminate, label,
declarator, unusedStatement) are tap-guarded, and the remaining handler
facade uses (`if`/`switch`/`with`/`labeled`/for-in-of left) turned lazy —
an owned non-identifier for-left walks its pattern off the facade, a
plain identifier left walks nothing. Totals: react 68→59%, lodash
68→55%, wall time flat. Remaining buckets are hook-serving (walk-side
declarator/rename analysis ~22%, assignment targets ~15%, free-rooted
chains ~14%, function params/`detectMode` ~8%) — the D4 counter is at
the point where the lazy `_soaAlloc` flip decides the rest.
**D4 lazy `_soaAlloc` landed**: `_soaAlloc` (and the identifier / literal /
template-element fast paths) no longer register facades — the grammar still
flows a transient facade object, but `nodeAt` rebuilds an identical one
from the columns on demand. `_soaPin` registers a facade only when it takes
on state the columns cannot rebuild: born-unfinished fills (Property,
SwitchCase), foreign-child memo writes (kid/list/template pin branches),
and every facade memo setter; the four `walkStatement`/`walkExpression`/
pre-walk seams plus `_walkStatementsIdList` register the object-held facade
before re-entering the id walk so identity survives the handoff.
`LiteralFacade` now derives the estree `regex`/`bigint` extras from the
columns (raw-text split for regex — `RegExp#source` escapes `/`) since
acorn's post-construction writes land on transient objects. Post-parse
registered facades drop to 8–11% of nodes; retained heap after parse+walk
holding the AST: react 1.04→0.77 MB, lodash 3.68→2.91, three.module
8.11→5.59 (−21 to −31%) — soaAst-on now retains less than the object
backend on all three fixtures. Warm parse+walk CPU is unchanged (transient
facade construction remains; removing it is the Phase-C2
grammar-flows-ids scope).
**Default-on landed**: `soaAst` became a `JavascriptParserOptions` schema
option defaulting to `true` (escape hatch `module.parser.javascript.soaAst:
false`), plumbed through `defaults.js` and the three `createParser` sites;
the parser-instance default flipped to on while the static `_parse` default
stays on object nodes — direct `_parse` callers (the eslint-scope analyses
in `JavascriptModulesPlugin`/`ConcatenatedModule`) traverse own keys and
now pin `soaAst: false` explicitly. Running the full integration surface on
the SoA backend surfaced three real gaps, each fixed with a regression
test: (1) a pure import/export top level defeats the parse() store
discovery (no owned facade in `Program.body`) while nested owned
statements still push ids — the walk seams now adopt the store for the
`statementPath`/`prevStatement` accessors; (2)
`CommonJsExportsParserPlugin`'s generic `this`-scan enumerated own keys,
which facades don't expose — facade child keys are now collected from the
prototype accessors (separate cache per backend); (3) the eslint-scope
consumers above must not receive facades (shorthand-pattern renames
corrupted concatenated output). Phase E numbers (this container,
interleaved A/B): an 86-module development build is wall-neutral (medians
~723ms object vs ~747ms SoA, distributions overlap) at −23% end-of-build
heap (40.6 → 31.4 MB); parse+walk retained-AST heap stays below the object
backend (lodash 2.89 vs 3.04 MB, three.module 5.47 vs 6.23 MB); warm
parse+walk CPU remains ~2× (52 vs 24 ms on lodash) from transient facade
construction — the Phase-C2 grammar-flows-ids scope recovers that.
**C2 slice 1 landed**: profiling the no-tap parse+walk showed
`adaptDirectivePrologue` materializing (and registering) every
function-body statement through `listAt`/`nodeAt` just to stamp
`.directive` — the single hottest facade path. The parser now flags
directive-prologue members in the columns (`FLAG_DIRECTIVE`) and
`ExpressionStatementFacade` derives the extra in its constructor; pinned
bodies keep the object path. Identifier names additionally memoize into
the `values` side list on first derivation, shared by pre-walk hook
probes, walk resolution and rebuilt facades. lodash parse+walk drops
52 → 44 ms (−15%); build heap unchanged (31.6 MB vs object 40.5); the
held-store retained micro-benchmark pays for the memoized names
(lodash 2.8 → 3.15 MB) — irrelevant to builds, whose stores die per
module. Remaining C2 buckets: walk-time child materialization in
binary/assignment/declarator handlers and member-root probing.
CodSpeed's Memory runner then flagged the column growth itself: sizing at
source/10 undershoots dense sources (typescript.js: 872k slots for 940k
nodes), so every column doubled and then `trim()` copied again —
≈125 MB of large allocations per typescript.js parse. Columns now size
from the worst corpus density (source/6) and trim only above 2× waste:
no fixture doubles, per-parse column churn drops to the single initial
allocation (typescript.js ≈52 MB), wall/retained unchanged.
**C2 slice 2 landed**: the four hottest remaining materialization sites
became column-native behind provability guards. Calls with a member callee
skip the facade when the chain probe proves no info (explicitly excluding
function/arrow objects — IIFE `.call`/`.bind` — and `import()` objects for
the importCall hook, with an own-taps gate on
`evaluate.for("MemberExpression")` that tolerates ImportMetaPlugin's
never-identifier tap). Declarators with a plain identifier binding skip
their facade when unregistered, untapped, and the init provably cannot
rename (`_soaCannotRename`: defined plain identifier or info-free member
chain); assignments do the same for identifier targets (plus empty
pattern/assign hook maps for the target's info) and info-free member
targets. `detectMode` reads the first statement from the list columns
(cooked literal values sit in `values`); registered blocks and pinned
first statements keep the facade list. React-fixture walk materialization
drops 66.7% → 47.4% of nodes; interleaved A/B: lodash parse+walk wins
every round (~2–7%, its object-literal inits stay on the facade path),
86-module build wall ≤ baseline with heap unchanged. Remaining C2
buckets: binary/logical/conditional handler evaluate gating, function
facades from dispatch (`params` reads), object-literal declarator inits.
**C2 slice 3 landed**: `_soaCannotRename` now also answers true for
evaluation-inert types — object/function/arrow/array/template/binary/
conditional/update/await/yield and non-typeof unary inits — via a
per-parse table that verifies the evaluate taps (the parser's own taps on
these only build computed values; indirection dispatchers like
New/Call/Sequence/Chain/Logical stay out since their evaluation can
forward an identifier). Non-typeof unary expressions and non-`in` binary expressions (while
only the harmony `in` tap sits on `binaryExpression`) walk facade-free on
the operator id in `aux`. React walk materialization 47.4% → 38.5%,
lodash 39.9% → 30.9% (the remaining declarator inits are
call/logical/sequence shapes that can legitimately rename); wall
neutral-to-positive under noise. Remaining C2 buckets: function facades
from dispatch (`params` reads), call/assignment info-full paths,
logical/conditional operator hooks (ConstPlugin always taps those).
**C2 slice 4 landed**: function/arrow walks no longer materialize the
function facade at dispatch. `_inFunctionScopeIds` mirrors
`inFunctionScope` on the columns when every param is a plain identifier
and the facade is unregistered: params (and the function-expression
self-name in `kid0`) define by column-derived name through
`_enterIdentifierId`, which materializes an identifier facade only when a
name-keyed pattern hook matches its info. Pattern params, registered
facades and the strict-mode diagnostics pass keep the object path.
React walk materialization 38.5% → 35.5%, lodash 30.9% → 25.0% (the
`_walkFunctionId` bucket drops to pattern-param functions only).
Remaining C2 buckets: call/assignment info-full paths and
`getMemberExpressionRoot`, logical/conditional operator hooks
(ConstPlugin always taps those), sequence/statement-path leftovers.
**C2 slice 5 landed**: info-full member chains gate their hook cascades
from the columns. `_soaMemberRootId` mirrors the `getMemberExpressionRoot`
descent (serving the call-rooted `callMemberChainOfCallMemberChain` gate
without materializing the chain), and `_soaDottedNameId` derives the
exact `getMemberExpressionInfo` dotted name for free-string roots. On
top of those: member callees skip evaluation and facades when
`evaluateIdentifier`/`callMemberChain`/`call` have no tap for the derived
names, member assignment targets skip when `assignMemberChain` cannot
match the root info, and member expressions skip when no `expression`
tap sits on the full name or any dot-boundary prefix (a superset of the
prefix walk's dispatched names) and the member-chain hooks are untapped
for the root. Tagged/defined roots, template members, and foreign links
keep the facade path. React walk materialization 35.5% → 25.1%, lodash
25.0% → 24.2%.
**C2 slice 6 landed**: profiling the actual react development build (not
the bare-parser attribution harness, which runs without plugins) showed
`CommonJsExportsParserPlugin`'s exported-function `this` scan as the top
remaining SoA cost — its generic `getChildKeys` walk read every facade
child getter, materializing whole exported subtrees. The scan now
descends store-backed subtrees on the column refs directly (kid slots
plus the list span are exactly the owned children; `ForStatement`'s
fourth child overflows into `aux` and is read explicitly), materializing
only registered nodes — whose children may be foreign or mutated —
property definitions (computed-key rule) and the `this` result.
`getChildKeys` disappears from the react build profile and the facade
constructor cost drops; wall stays neutral. The plan's opening status
header was also rewritten to the current position.
**C2 slice 7 landed**: a retained-memory breakdown on typescript.js
(the largest parser-unit fixture) showed the bare walk still 9% above
the object backend — 34.5 MB of walk-materialized facades (185k nodes,
19.7%) plus ~20 MB of column slack (the length/6 pre-size heuristic
left 38% capacity unused, under the old only-trim-past-2x rule). Two
fixes: `trim()` now snugs whenever slack exceeds 1/8 of capacity and
~2k nodes (normal code runs 9.5–18.5 chars/node, minified 6.5, so the
/6 estimate stays for growth safety); and `_soaCannotRename` extends to
Call/New/Logical/Conditional inits whose evaluation provably cannot
yield an identifier — own-tap gates plus the name-keyed
`evaluateCallExpression`/`evaluateCallExpressionMember`/
`evaluateNewExpression` dispatch checks, with logical/conditional
recursing into the operands their evaluation could pass through.
Zero-tap `expressionLogicalOperator`/`expressionConditionalOperator`
(+`collectGuards`) walks also descend without materializing the hook
argument. typescript.js retained flips from +9% to −23% vs the object
backend (103.4 → 73.0 MB), walk materialization 19.7% → 6.0% (lodash
24.2% → 7.2%, react 25.1% → 17.7%), lodash parse+walk wall ~40 → 28 ms.
The remaining ~25% bare-parse instruction gap (CodSpeed js-parser-unit
Simulation) is parse-time transient facade construction — the "grammar
flows ids" end-state, not walk materialization.
**C3 slice 1 landed** (grammar-flows-ids opening): a typescript.js CPU
profile put the remaining SoA-specific cost in three places — the
function-walk bail materializing every param list when any param is a
pattern (`get params` → `listAt`, ~7% of the parse), the
`Property`/`SwitchCase` born-unfinished two-phase constructions pinning
every object property and switch case at parse (`_soaPin`, ~3%), and
transient facade construction itself. The first two are gone:
`_inFunctionScopeIds` now enters mixed param lists column-native
(pattern params alone materialize for the `enterPattern`/`walkPattern`
pair), and `parseProperty`/`parseSwitchStatement` collect into
locals/scratch and emit finished single-shot nodes — the transient
serves `checkPropClash`/pattern conversion from pre-warmed memos, and
`copyNode` clones store-backed shorthand values onto fresh rows instead
of foreign copies. The walk and pre-walk property/switch-case handlers
descend the now-column-owned children with registered-facade guards.
typescript.js retained drops 73.0 → 61.2 MB (−35% vs the object
backend), bare parse+walk wall 858 → 740 ms (obj 580), and `_soaPin`
disappears from the profile. A canRename-emptiness gate that skipped
the rename evaluation wholesale was tried and reverted: every real
build taps `canRename` (require/URL/DefinePlugin), so it only
accelerated plugin-less benchmark parses. Next: the facade constructors
themselves (`FacadeBase` + per-type ctors, ~4% and the GC share) — the
full id-flow through the grammar's recursion.
**C3 slice 2 landed** (cheaper transients): two construction cuts.
`_soaIdentifier` now lands the already-interned token name in the side
list up front — the facade constructor had been re-deriving every plain
identifier name with a `source.slice()` (one substring allocation per
identifier) because the emitter kept `values` sparse while the
constructor filled it anyway. And the facade classes no longer
pre-declare their memo slots: transients (the vast majority) never
memoize, so skipping the per-instance `UNSET` writes and the slots
beats keeping memos in-object for the few registered facades that now
spill on first materialization (interleaved A/B: ~5% off the bare
typescript.js parse). Combined: typescript.js parse+walk 740 → ~685 ms
(object 570–615 under the same noise), `IdentifierFacade` leaves the
profile, GC 345 → 264 ms, retained 61.2 → 54.3 MB (−42% vs the object
backend). Remaining SoA-specific profile entries: `FacadeBase` (~94 ms
/ 2.7%), `nodeAt` (~100 ms), `trim` (~66 ms) — the next cut is the
id-flow through the owned grammar methods so `_soaAlloc` stops
constructing a facade per node at all.
**C3 slice 3 landed** (expression grammar flows raw refs): every
expression, pattern and function-expression emitter now allocates its
row and returns the raw ref — a plain number — instead of a transient
facade; only statements, declarators, switch cases, export specifiers
and function declarations still hand back node objects at parse. The
grammar reads flowing nodes through one accessor seam (`_refIs`,
`_refStart`/`_refEnd`, `_refIdentName`, `_refOptional`,
`_refTemplateTail`) whose raw-ref arms read the columns, and foreign
consumers materialize at the seam via `_refMat` (class ids, supers,
keys and values, import/export specifiers and sources, meta
properties, tagged templates, dynamic-import children).
`toAssignable`/`checkLVal*` gained raw-ref arms that retag and descend
the columns in place (a pinned owner delegates to the facade path so
memoized foreign children stay visible), the `__proto__` clash check
moved into parse-time locals stashed by `parseProperty` (no key facade
needed), and previously-blind base helpers were owned raw-ref-aware:
`isAsyncProp`, `parsePropertyValue`, `parseGetterSetter`,
`isSimpleAssignTarget`, `toAssignableList`, the import
specifier/attribute methods and `parseImportMeta`. Two acorn checks
proved unreachable for raw refs and are documented instead of
duplicated (ident-`await` in `toAssignable`, member-binding in
`checkLValSimple`). typescript.js bare parse+walk drops 685 → ~595 ms
vs obj ~560 ms — the SoA-specific wall gap shrank from ~115 ms two
slices ago to ~35 ms — with retained memory holding at 55.6 vs 94.6 MB
(−41%). Parse-time facade construction is now limited to the
statement family; the next cut is the statement grammar and the
`parseTopLevel`/`ParseResult{store, rootId}` boundary so
`program.body` stops carrying per-statement objects.

**C3 slice 4 landed** (statement grammar and the `parseTopLevel`
boundary flow ids): all 21 statement emitters return raw refs, the
Program is a store row (aux carries `sourceType`) returned through a
lazy-body `ProgramFacade`, and an owned `parseTopLevel` wires the
top-level list into the columns. Foreign statements that acorn still
builds (import/export/class declarations) are _adopted_: they get a
row and register as its facade, so one import no longer pins a whole
module body. `JavascriptParser.parse` now runs detectMode and all
pre-walk/walk passes on the root id (with a new
`_modulePreWalkStatementsId` and adopted-type arms in the id
dispatchers), falling back to the object walkers only when a program
hook materialized — and possibly replaced — `ast.body`;
`HarmonyDetectionParserPlugin` and `UseStrictPlugin`, which read the
body on every module, probe the columns instead (via the exported
`SoaAst.KEY_MEMO` seam), so real builds keep the id path. Also fixes a
slice 3 regression caught by test262: acorn's label detection reads
`expr.type` and is blind to raw refs, so `await:`/`async:`/`using:`
labels (delegated statement heads) mis-parsed; the owned
`parseExpressionStatement` now recovers the pending label
(statements/labeled/value-await-non-module). typescript.js retained
is 53.6 vs 94.6 MB (−43%) and the bare parse+walk wall gap closed to
within noise (≈ 1%, ~555 vs ~548 ms). Parse-time transient facades are
gone entirely; node objects at parse now exist only for adopted/foreign
constructs and seam materializations.

**C4 slice 1 landed** (three-long production CPU): CodSpeed's
recurring Simulation regression on three-long production (−21%)
reproduced locally at +17% (interleaved same-machine A/B). Profiling
attributed the gap to per-parse fixed cost and facade materialization
under the production passes on ~1100 tiny ESM modules. Two cuts: the
store's twelve per-parse TypedArray allocations collapsed into one
backing ArrayBuffer with views (measured 5x cheaper construction;
`_grow`/`trim` share the layout via `_reallocColumns`, and `trim`
detaches a still-shared `flat` view so it cannot pin the untrimmed
buffer), and `getMemberExpressionRoot` gained a store-backed arm that
descends the columns via `_soaMemberRootId`, materializing only the
chain root for the object-path callers (`getMemberExpressionInfo`,
object `walkCallExpression`). three-long production A/B after: +2.5%
and +8.5% across two 11-run rounds (from a stable +17%); typescript.js
bare parse+walk and retained memory (−43%) unchanged. The remaining
tail decomposes into statement-hook materialization (~8 ms/build,
`SideEffectsFlagPlugin`'s `statement` tap), parse-time import/export
seam materialization via `_refMat` (~6 ms/build) and the evaluate-path
long tail — the next C4 targets.

**C4 slice 2 landed** (new-expression gate; structural-tail record):
`_walkNewExpressionId` mirrors the call-expression gate — a defined,
untagged identifier callee matches no name-keyed `new` hook, so
`new LocalClass()` (the dominant three.js shape) walks straight from
the columns. The rest of the profiled three-long tail is structural
under the current hook contracts and is recorded here rather than
chased: `hooks.statement` (SideEffectsFlagPlugin, InnerGraphPlugin)
and `hooks.preDeclarator` (eight production taps) receive
identity-stable node objects by contract — InnerGraph keys WeakMaps by
statement identity — so every statement/declarator materializes while
those taps are live (~8 ms/build); the parse-time `_refMat`
import/export seams (~6 ms/build) would need import/export specifiers
owned as rows end to end. three-long production sits at ~+3-8%
(within run noise) after slices 1-2, from a reproduced +17%.

**C5 slice 1 landed** (column gates — the "structural" tail wasn't):
the first full main-vs-branch popular-library sweep (cold production
builds, interleaved medians) showed the branch regressing end to end —
typescript +20.2% CPU / +17.4% peak RSS, three-long +10.5%, lodash
+7.3%, react neutral — and profiling attributed it to the hook-forced
materialization recorded under slice 2 as structural, at scale
(typescript.js: 24.5 k declarators × 7 `preDeclarator` taps, 19 k ifs
under `statementIf`/`collectGuards`, every statement under two
`statement` taps). The contract stays intact but the _bail_ no longer
requires the node: `parser.registerColumnGate(hook, tapFn, gate)`
pairs a tap (matched by function identity) with a column predicate
encoding that tap's own bail conditions; `_soaHookNeeded` lets the id
walkers skip materialization _and_ the hook call only when every tap
on the hook is gated and none passes (any third-party tap or
interceptor forces the old path). Gates landed beside all core taps —
SideEffectsFlag/InnerGraph (`statement`, `preDeclarator`,
`declarator`), Compatibility, API, ConstExports, CommonJsImports,
CreateRequire, ImportParser, WorkerAndWorklet (`preDeclarator`),
ConstPlugin (`statementIf`, `expressionLogical|ConditionalOperator`
via the new conservative `_soaEvalUnknowable` column probe) and
HarmonyImportDependencyParserPlugin (`collectGuards`, keyed off
`lastHarmonyImportOrder`). On a typescript build the gates skip 141 k
statement / 22.6 k preDeclarator / 18 k statementIf calls with a few
hundred materializations left. After: lodash −0.9% (neutral),
three-long +5-6%, typescript ≈ +15% CPU with peak RSS +5.7% (−32 MB
from +17.4%); retained heap unchanged. The typescript CPU residue now
profiles as parse-side owned-grammar overhead (emit/`parseIdent`/
`readWord` families, ~200 ms on the 9 MB file) plus gate probe cost
(`StackedMap.get` +19 ms) — the C5 slice 2 target, alongside the
bytes/6 capacity heuristic (946 k rows vs 1.52 M capacity on
typescript.js) for the remaining peak-RSS gap.

**C5 slice 2 landed** (transient stores skip `trim()` + absent-child
fast path): fresh full-build profiles put the whole `_reallocColumns`
copy cost in post-parse `trim()` (none in `_grow`; 24–190 ms/build on
typescript, variance from page-fault/GC interplay), and a corpus probe
overturned the trim rationale — untrimmed slack is untouched zeroed
pages (virtual, barely resident), while the trim itself pays a full
copy _and_ transiently doubles resident pages, so it was costing CPU
and peak RSS to optimize the GC-visible `byteLength`. Production
parses now pass `transientAst: true` (the store dies with the walk)
and `parse()` skips the snug; direct `_parse` callers keep trimming
(they may retain the AST). The same probe showed the "6.4 bytes/node
floor" is wrong for minified sources (lodash.min.js: 2.62) — the /6
capacity heuristic under-allocates those and they pay geometric `_grow`
copies (~1× final size, acceptable); left as-is. Also: `kid === 0`
child slots no longer materialize the owner facade to distinguish
absent from foreign — a foreign child is always pinned onto its
owner's memoized facade, so `store.facades[id] === undefined` proves
absence (`_walkExprChildId`, `_walkArrayExpressionId` empty/pinned
lists). typescript full build: 2045 → 1883 ms median (−8%), peak RSS
308 → 282 MB (main: 298 MB — the branch now sits _below_ main);
lodash flips faster than main (−4%); three-long unchanged (+4%,
within noise). Remaining typescript CPU residue: `nodeAt` from
`_walkExprChildId` fallbacks and `listAt` list materialization
(~90 ms), SoA emission (`_emitCallExpression`/`_soaIdentifier`/
`_soaLiteral`, ~75 ms), `buildLineStarts` (+16 ms).

**Perf slice: packed facade memo.** A `%HasDictionaryElements` probe
showed the parse-time facade pins (first pin at a large index on a
bare `[]`) demote `store.facades` to dictionary elements, turning
every memo probe in the read-heavy walk — `nodeAt`'s cache check and
the absent-child fast paths — into a hash lookup. `_packFacades()`
now repacks the memo into a packed-elements array (sized to `count`,
pins carried over, identity preserved) once at the end of every SoA
parse; parse-time pins stay on the cheap sparse array. typescript
full build ~1883 → ~1780 ms with peak RSS 282 → ~270 MB. Parse-only
(production options, typescript.js warm): acorn 698 ms, SoA ~390 ms
(1.8×), retained heap 126 → 34 MB (3.7×). `store.values` measured
holey-but-fast (no fix needed).

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

Allocation-churn profile (sampling heap profiler, typescript.js): ≈ 124 MB
allocated per parse, dominated by node objects and child arrays
(`parseExprAtom`, `parseExprList`, `parseSubscript`) — the churn the SoA
backend exists to eliminate.

**A1 allocation pass (landed).** Profile-guided, CPU-neutrality gated:
skip the param-clash record for zero-param/single-identifier-param functions,
pool function-body `labels` arrays, serve comment `range` lazily like node
ranges. typescript.js: churn 124 → 119 MB/parse, retained AST+comments
98.1 → 95.2 MB, wall time neutral.

**Rejected with data** (do not retry in object-AST form):

- Scope/Set pooling across `exitScope`: −4 MB churn but ≈ 5% parse CPU —
  old-to-new write barriers on pooled objects plus `Set#clear` reallocating
  its backing table cancel the win.
- Long-identifier interning (flat copies past the 12-char slice threshold,
  own cache table): −3 MB retained but ≈ 5–8% parse CPU on miss-heavy symbol
  spaces like typescript.js, where flattening on every eviction outweighs
  the sharing. Name-string deduplication belongs to Phase C, where names become
  offset-derived reads through the existing `WORD_CACHE` interning.

## 8. Non-goals

- No change to the non-lazy mode (direct `WebpackParser` users, plugin
  subclasses overriding parse methods) — it keeps acorn object nodes.
- No public accessor-path API (CSS-style `A`) for JS plugins in this effort;
  that is a possible webpack 6 evolution once the SoA backend is proven.
- No tokenizer SoA: the tokenizer already runs on a single mutable token with
  table-driven dispatch; there is no token buffer to convert.
