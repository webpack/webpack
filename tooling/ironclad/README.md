# ironclad — ownership and borrow lint prototype

An experiment: how much of Rust's ownership model can a single-file ESLint rule
enforce on JavaScript, using scope analysis and code-path analysis only?

**Status: prototype.** It is not wired into `eslint.config.mjs` and does not run
in CI. Run it explicitly, or through the unit test.

## Markers

Ownership is expressed in comments, so nothing reaches the emitted code and the
Node 10 baseline is untouched:

```js
const b = /** @move */ a; // `a` is unusable from here on
const r = /** @borrow */ a; // shared, read-only view of `a`
const m = /** @borrowMut */ a; // exclusive view of `a`
```

A marker may also sit on the whole statement — `/** @move */ const b = a;` — or
on a call argument — `consume(/** @move */ a)`.

A marker on a **member** moves that field alone, the way Rust reads
`let x = s.x;`:

```js
const rules = /** @move */ config.rules; // only `config.rules` is gone
```

## Contracts on signatures

Rust states ownership once, at the signature — `fn consume(s: String)` against
`fn read(s: &String)` — and every call site is then checked against it with no
annotation of its own. Marking a **parameter** does the same here:

```js
function consume(/** @move */ config) {
	return config.mode;
}

const options = load();
consume(options);
use(options); // useAfterMove — `consume` took ownership
```

The block form names the parameter, which suits a codebase that already writes
its types in JSDoc:

```js
/**
 * @param {Config} config the config
 * @move config
 * @borrowMut stats
 */
function apply(config, stats) {}
```

`@borrow` and `@borrowMut` on a parameter borrow the argument **for the
duration of the call**, so the exclusivity rule reaches across arguments:

```js
function update(/** @borrowMut */ stats, extra) {}

update(counters, counters); // useWhileMutablyBorrowed
```

`@move this` on a method is Rust's `fn into_inner(self)` — the call consumes
the receiver:

```js
class Session {
	/** @move this */
	close() {}
}

session.close();
session.ping(); // useAfterMove
```

### Returning a borrow

`@borrow return` says the result carries a borrow of one of the inputs, the way
`fn first(v: &Vec<T>) -> &T` does. The owner then stays borrowed for as long as
the result is alive, not just for the call:

```js
/**
 * @borrow config
 * @borrow return
 */
function rulesOf(config) {
	return config.rules;
}

const rules = rulesOf(options);
options.mode = "none"; // mutationWhileShared — `rules` still points into it
use(rules);
```

Which input it borrows from follows Rust's elision rule: with exactly one
borrowed input, the output borrows from that one. With several, say which —
the rule reports `unnameableReturnLifetime` rather than guessing:

```js
/**
 * @borrow a
 * @borrow b
 * @borrow return a
 */
function pick(a, b) {}
```

`@borrow this` works as the source too, which is `fn iter(&self) -> Iter<'_>`.

### Named lifetimes

Naming a single parameter cannot say that a result borrows from **several**
inputs, which is Rust's own headline example. A lifetime name can:

```js
/**
 * @borrow x 'a
 * @borrow y 'a
 * @borrow return 'a
 */
function longest(x, y) {
	return x.length > y.length ? x : y;
}
```

`fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` — the result may point into
either argument, so **both** stay borrowed while it is alive, and both are free
once it dies. Distinct names keep them apart, exactly as `<'a, 'b>` does:

```js
/**
 * @borrow x 'a
 * @borrow y 'b
 * @borrow return 'a
 */
function pick(x, y) {
	return x;
}

pick(first, second);
second.mutated = 1; // fine — `'b` is not what the result carries
```

A lifetime the signature never declares is `unnameableReturnLifetime`, the way
Rust rejects an undeclared `'c`.

### `'static`

`'static` is a borrow that outlives the program, so nothing local can satisfy
it — which is also how you say "this value is going to be retained":

```js
/** @borrow handler 'static */
function addListener(handler) {}

function setup() {
	const local = makeHandler();
	addListener(local); // borrowMustBeStatic — `local` dies with `setup`
}
```

`@move return` is the other direction — the function hands ownership out, so
discarding the result is `resultIgnored`, Rust's `#[must_use]`:

```js
/** @move return */
function acquire() {}

acquire(); // resultIgnored
```

Contracts are found on function declarations, on functions and arrows stored
in a variable, and on methods. A method has no resolvable receiver, so it is
matched by name and only when that name carries one contract in the file; two
declarations of the same method name disable it rather than guess.

### Structs that hold a borrow

`struct Parser<'a> { input: &'a str }` is a constructor contract: the instance
carries the lifetime, so the source stays borrowed for as long as the instance
is alive.

```js
class Parser {
	/**
	 * @borrow input 'a
	 * @borrow return 'a
	 */
	constructor(input) {
		this.input = input;
	}
}

const parser = new Parser(source);
source.mutated = 1; // mutationWhileShared — `parser` points into it
use(parser);
```

`@move input` on the constructor is the owning version, and then the source is
gone after `new`. A borrow of something **local** stored on `this` is
`borrowEscapes`, because the instance outlives it:

```js
class Cache {
	fill() {
		const table = build();
		this.view = /** @borrow */ table; // borrowEscapes — `table` dies here
	}
}
```

### Callbacks: `Fn` against `FnOnce`

Moving a captured value inside a callback is `moveInClosure`, because a
callback may run any number of times. `@once` is the promise that it does not:

```js
/** @once callback */
function defer(callback) {}

defer(() => close(/** @move */ session)); // fine — runs at most once
items.forEach(() => close(/** @move */ session)); // moveInClosure
```

`setTimeout`, `setImmediate`, `queueMicrotask`, `requestAnimationFrame` and
`nextTick` are in the default `callsOnce` list.

### Resources that can never be released

`setInterval` and `addEventListener` keep something alive until a matching
release call. Whether one ever happens is not decidable from one file — but
whether it _could_ is:

```js
function start() {
	setInterval(() => poll(), 1000); // resourceNeverReleased — no id to clear
}

function mount() {
	target.addEventListener("click", () => handle()); // no name to remove
}
```

Neither can ever be released: the id is thrown away, and an inline
listener has no name to hand to `removeEventListener`. Keeping the handle is
enough to satisfy the rule — it does not insist the release actually happens,
because that would be a guess:

```js
function start() {
	const timer = setInterval(() => poll(), 1000);
	this.timer = timer; // fine — something can still clear it
}
```

A top-level acquire is never reported: it lives as long as the program, which
is the `'static` case rather than a leak. Only acquiring inside a function
repeats. `retainsUntilReleased` maps each call to where its handle lives —
`"result"` or an argument index — and defaults to
`{ addEventListener: "1", setInterval: "result" }`.

### Across modules

With type-aware linting a contract is read from wherever the callee is
**declared**, not only from the file being linted:

```js
// lib.js
/**
 * @param {Config} config the config
 * @move config
 */
function consume(config) {}

// main.js
const { consume } = require("./lib.js");
consume(options);
use(options); // useAfterMove — read out of lib.js
```

typescript-eslint hands the rule the whole `ts.Program`, so the callee's symbol
resolves to its declaration in another file and the JSDoc on it is read there.
Everything above travels: `@move`, borrows, named lifetimes, `'static` and
`@move return`. Without type services there is no program to consult and only
same-file contracts apply, which is the same degradation as the platform
tables.

This is worth spelling out because it was expected to need more: the isolated
file problem is usually answered with "write a TypeScript language service
plugin instead". No plugin is needed — the program is already there.

**Markers share a JSDoc block with anything else**, so a cast and a marker can
be written together, and a tag may be on its own line:

```js
const b = /** @type {Foo} @move */ (a);
const c = /** @type {Foo} */ (/** @move */ a);

/**
 * @type {Foo}
 * @move
 */
const d = a;
```

The first form needs care and gets it: ESTree drops grouping parens, so that
comment sits before a token that is not in the tree. The rule steps out through
grouping parens to find it, and stops at a `(` that opens a call or a parameter
list — a comment on `/** @move */ f(a)` marks the call, never `a`.

A marker must be a **tag**: `@move` counts, `docs@move` in prose does not.

## What it checks

| Message                    | Meaning                                                                |
| -------------------------- | ---------------------------------------------------------------------- |
| `useAfterMove`             | the value was moved and is read again                                  |
| `useAfterPartialMove`      | a field that was moved out is read again                               |
| `wholeUseAfterPartialMove` | the whole value is used after one of its fields was moved out          |
| `moveInLoop`               | a variable declared outside the loop is moved inside it                |
| `moveInClosure`            | a captured variable is moved inside a function that may run repeatedly |
| `moveWhileBorrowed`        | moved while a borrow is still live                                     |
| `useWhileMutablyBorrowed`  | the owner is touched while a `@borrowMut` view is live                 |
| `mutationWhileShared`      | the owner is mutated while a `@borrow` view is live                    |
| `conflictingBorrow`        | a second borrow conflicts with a live one (`&mut` excludes everything) |
| `borrowEscapes`            | a borrow is stored somewhere that outlives the owner                   |
| `resultIgnored`            | a result that carries ownership is discarded                           |
| `unnameableReturnLifetime` | a returned borrow does not say which input it borrows from             |
| `borrowMustBeStatic`       | a `'static` parameter was handed something that dies first             |
| `resourceNeverReleased`    | the handle needed to release a resource is discarded                   |

Branches are handled through ESLint's code-path events: a value moved in one arm
of an `if` is still usable in the other, and moved after the merge point.

**Closures are not a blind spot.** A nested function starts a code path of its
own, so its state is seeded from the point the function is written — a callback
reading something already moved is caught. Moving a captured variable from
inside a callback is `moveInClosure`, for the same reason as `moveInLoop`: the
callback may run more than once. An immediately invoked function is the
exception — it runs once, in place, so what it moves is moved for its caller
too.

Borrows are **non-lexical** — a borrow dies at the last reference to the
variable holding it, not at the end of the block, so this is accepted:

```js
const m = /** @borrowMut */ a;
m.x = 2;
use(a.x); // `m` is dead by here
```

## Partial moves

Moves are per-field, so the rule can follow Rust's reading of a partial move —
and can also model a call that invalidates one facet of an object that stays
valid otherwise. Those are different things, and the rule keeps them apart.

**A partial move** (a marker on a field, or destructuring) kills the field
_and_ the whole value, exactly as Rust does:

```js
const { rules } = config;
apply(config.plugins); // fine — a different field
apply(config.rules); //   useAfterPartialMove
apply(config); //         wholeUseAfterPartialMove
```

**A consumed member** kills only that member, because the object really is
still usable:

```js
const data = await res.json();
report(res.status); //   fine — the response is not consumed, its body is
await res.text(); //     useAfterPartialMove: `res.body` is gone
```

Note the second one works across method names: `json`, `text`, `blob` and
friends all consume `body`, so any of them after any other is a finding, and
so is reading `res.body` directly.

## Options

Every option is named after what the calls in it **do**.

```js
"ironclad/ownership": ["error", {
	// Treat `const b = a` as a move. Off by default — see "Measured" below.
	treatAssignmentAsMove: false,
	// These calls consume every argument. Empty by default: that is a policy,
	// not a fact about the language.
	consumesArguments: [],
	// These calls detach what reaches their transfer list — `f(x, [buf])` or
	// `f(x, { transfer: [buf] })`. Nothing else about the call moves.
	detachesTransferList: ["postMessage", "structuredClone"],
	// Treat `const { x } = data` as moving `data.x`. Off by default — Rust
	// reads it that way, JavaScript does not. See "Measured" below.
	treatDestructuringAsPartialMove: false,
	// These calls keep something alive until released, mapped to where the
	// handle for releasing it lives: "result", or an argument index.
	retainsUntilReleased: { addEventListener: "1", setInterval: "result" },
	// These calls invoke their callback at most once, so a move inside it does
	// not repeat.
	callsOnce: [
		"nextTick",
		"queueMicrotask",
		"requestAnimationFrame",
		"setImmediate",
		"setTimeout"
	],
	// These methods consume the whole object they are called on.
	consumesReceiver: [],
	// These methods consume one named member of their receiver, leaving the
	// object itself usable.
	consumesReceiverMember: {
		"HTMLCanvasElement#transferControlToOffscreen": "getContext"
	},
	// These methods lock their receiver until the method they map to.
	locksReceiverUntil: {
		"ReadableStream#getReader": "releaseLock",
		"WritableStream#getWriter": "releaseLock"
	}
}]
```

`Type#method` means: match the method name, and — **only if type information is
available** — also require the receiver to be that type or a subtype of it. A
bare `method` matches by name alone. So one entry covers both setups, and the
same config gets stricter the moment types are switched on.

## The platform table

The last three options are why the rule finds things without any marker: the web
platform already ships genuine move and exclusive-borrow semantics, and every one
of them throws at runtime when violated.

```js
worker.postMessage(value, [buffer]);
use(buffer.byteLength); // useAfterMove — the buffer is detached

const offscreen = canvas.transferControlToOffscreen();
canvas.getContext("2d"); // useAfterPartialMove — the context is gone
canvas.width; //           fine — the element itself is not

const reader = stream.getReader();
stream.cancel(); // useWhileMutablyBorrowed — the stream is locked
```

Note what is _not_ in the table: `postMessage(value)` without a transfer list
structured-clones its argument, so it is not a move.

`Response` body consumption is **not** on by default, because `json`, `text`,
`blob`, `bytes` and `formData` are names any object may have — matching them by
name alone produced two false positives in `lib/` (`callbacks.text(…)` and
`modes.text(…)`). Switch it on where type-aware linting can confirm the
receiver:

```js
consumesReceiverMember: {
	"HTMLCanvasElement#transferControlToOffscreen": "getContext",
	"Body#arrayBuffer": "body",
	"Body#blob": "body",
	"Body#bytes": "body",
	"Body#formData": "body",
	"Body#json": "body",
	"Body#text": "body"
}
```

A lock is deliberately **lexical**, unlike a marker borrow: an unreleased lock
is still held, so it runs to the end of the owner's scope rather than to the
reader's last use.

## With type information

The rule reads typescript-eslint's `parserServices` when they are there, and
works unchanged when they are not. Types are used for two things:

- **Narrowing the platform table.** A `getReader()` on something that is not a
  `ReadableStream` stops being a finding.
- **Deciding what is copied.** Whether a value is a primitive comes from its
  type instead of from the shape of its initializer.

Measured on a fixture with a real `ReadableStream`, an `HTMLCanvasElement` and
a look-alike object exposing its own `getReader()`:

|                       | findings                                       |
| --------------------- | ---------------------------------------------- |
| without type services | 3 — including the look-alike, a false positive |
| with type services    | 2 — the look-alike is correctly ignored        |

Type-aware tests run against `testTypeParser.js` rather than a TypeScript
program, so the suite needs no extra dependency.

Body consumption is the case that needs both halves: partial moves to say that
`res.json()` invalidates `res.body` and not `res.status`, and types to say that
the receiver is really a `Response`. Measured on a fixture with a real
`Response` and a look-alike exposing its own `text()`:

|                       | findings                                       |
| --------------------- | ---------------------------------------------- |
| without type services | 2 — including the look-alike, a false positive |
| with type services    | 1 — the real double-read of the body           |

## Measured on `lib/`

666 files, 235k lines, ESLint 9:

| Configuration           | Findings | Lint time (parse + scope + rule) |
| ----------------------- | -------- | -------------------------------- |
| no rules (baseline)     | —        | 4.4 s                            |
| defaults                | **0**    | 5.4 s (+22%)                     |
| `treatAssignmentAsMove` | **2872** | 5.6 s                            |

Two results worth keeping:

- With markers and the platform table, the rule is silent on a large real
  codebase — the design goal, since a linter that cries wolf gets switched off.
  The scan is also how the `locksReceiverUntil` prototype-chain bug was found:
  every `x.toString()` was being read as a lock, for 127 findings.
- `treatAssignmentAsMove` produces ~2.9k findings on correct code. JS
  passes references by design; assignment is not a move, and no heuristic
  rescues that. It stays opt-in and off.
- `treatDestructuringAsPartialMove` produces 286, an order of magnitude fewer,
  and 217 of them are `wholeUseAfterPartialMove` — the exact rule where Rust
  and JavaScript disagree, since `const { x } = data` copies a reference rather
  than consuming `data`. Also opt-in and off, but close enough to be usable on
  a codebase written with it in mind.

## Rust fidelity

What the rule keeps from Rust, and where it deliberately parts company:

| Rust                                  | here         |                                                         |
| ------------------------------------- | ------------ | ------------------------------------------------------- |
| borrow ends at last use (NLL)         | same         |                                                         |
| moved in one branch → moved at join   | same         |                                                         |
| `&mut` excludes every other borrow    | same         |                                                         |
| a partial move blocks the whole value | same         |                                                         |
| a reference may not outlive its owner | same         | `borrowEscapes`                                         |
| assignment moves a non-`Copy` value   | **opt-in**   | 2872 findings on correct `lib/` code                    |
| destructuring partially moves         | **opt-in**   | 286 findings; JS copies a reference                     |
| `Fn` vs `FnOnce`                      | approximated | `moveInClosure` — a callback's call count is unknowable |
| move checking is sound                | **unsound**  | aliasing is untracked; biased to false negatives        |

The last row is the one that cannot be fixed by more work on this rule. Rust
knows every alias because the type system forbids the ones it cannot see;
JavaScript hands them out freely, so `arr.push(a)` ends tracking. What is
tracked is what a single file can prove.

Worth stating plainly, since it is easy to assume otherwise: none of this
prevents **leaks**. Leaking is safe in Rust too — `mem::forget` and `Box::leak`
are safe functions and `Rc` cycles leak. Ownership buys temporal safety, which
in JavaScript the garbage collector already provides; what it buys here is
_logical_ invalidation. Leak detection is a different property — reachability
from a long-lived root — and would reuse this rule's escape analysis rather
than its move checking.

## Syntax coverage

Checked, not assumed. The rule was run over webpack's own test corpus —
**9,574 files, 151k lines** of deliberately exotic syntax under
`test/cases`, `test/configCases`, `test/watchCases` and `test/hotCases` —
with **zero crashes and zero findings**, and then over a matrix of 60
constructs that each place a move or a borrow inside the construct and assert
what comes out.

Handled: `if`/`else`, `switch`, `try`/`catch`/`finally`, every loop form
including `for await`, labelled `break`/`continue`, ternaries, `&&`/`||`/`??`,
sequence expressions, `throw`, generators and `yield`, `async`/`await`,
top-level await, optional chaining and optional calls, computed members,
spread in calls, arrays, objects and transfer lists, tagged templates,
`var` hoisting, shadowing, class static blocks, private fields, getters and
setters, computed method names, static and class-expression methods, object
methods, `super`, default and rest parameters, destructuring parameters, ESM
`import`/`export`, and dynamic `import()`.

Two gaps the matrix found, both recorded below rather than papered over.

## Known limits

- Values are tracked within a single file. Contracts cross module boundaries
  when type services are available, but the move and borrow state of a value
  never leaves the file it lives in.
- Aliasing is not tracked: once a value reaches `arr.push(a)` or `o.child = a`,
  the rule loses it. Unsound by construction, deliberately biased to false
  negatives.
- Closure state is seeded in source order, so a callback written _before_ the
  move but running _after_ it is not caught. Fixing that needs to know when the
  closure escapes, which is the aliasing problem above.
- Destructuring counts as a read unless `treatDestructuringAsPartialMove` is
  set; see the measurement above for why it is not the default.
- Loop back-edges are not iterated to a fixed point. `moveInLoop` instead asks
  whether the move's segment can be reached again, so `break` and `return` out
  of the loop are not reported.
- Without type information the platform table matches method names alone, so a
  `getReader` on something that is not a stream is a false positive.
- The rule walks source order, so a use that runs **after** a move but is
  written **before** it is missed. The `for` update expression is the case that
  shows it: `for (…; …; use(a)) { consume(/** @move */ a); }` reports the loop
  but not the use. Closing it needs the loop fixed point above.
- A spread argument has no position, so no parameter contract applies to it:
  `f(...[x])` is not a move even when `f` declares one. A spread inside a
  transfer list is still detached, since that names its elements.
- A method contract is matched by name, so a second method of that name
  anywhere in the file disables it — including one that declares nothing.
- Member moves are per-name, not per-path: `a.b.c` is tracked as `a.b`.
  Computed access (`a[key]`) is never treated as a move or as a use of a moved
  member.
- Whether a value is a primitive falls back to its initializer's shape when no
  type information is available.

## Running it

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js test/Ironclad.unittest.js
```

or through the wrapper: `yarn test:base --testPathPatterns="Ironclad"`.
