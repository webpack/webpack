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

## What it checks

| Message                   | Meaning                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `useAfterMove`            | the value was moved and is read again                                  |
| `moveInLoop`              | a variable declared outside the loop is moved inside it                |
| `moveInClosure`           | a captured variable is moved inside a function that may run repeatedly |
| `moveWhileBorrowed`       | moved while a borrow is still live                                     |
| `useWhileMutablyBorrowed` | the owner is touched while a `@borrowMut` view is live                 |
| `mutationWhileShared`     | the owner is mutated while a `@borrow` view is live                    |
| `conflictingBorrow`       | a second borrow conflicts with a live one (`&mut` excludes everything) |
| `borrowEscapes`           | a borrow is stored somewhere that outlives the owner                   |

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

## Options

```js
"ironclad/ownership": ["error", {
	// Treat `const b = a` as a move. Off by default — see "Measured" below.
	implicitMove: false,
	// Calls that consume every argument. Empty by default: this is a policy,
	// not a fact about the language.
	moveOnCall: [],
	// Calls with a transfer list — `f(x, [buf])` or `f(x, { transfer: [buf] })`.
	// Only what reaches the list is detached.
	transferringCalls: ["postMessage", "structuredClone"],
	// Methods that consume the object they are called on.
	consumesReceiver: ["HTMLCanvasElement#transferControlToOffscreen"],
	// Methods that lock their receiver, mapped to the method that unlocks it.
	locksReceiver: {
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
canvas.getContext("2d"); // useAfterMove — the canvas is consumed

const reader = stream.getReader();
stream.cancel(); // useWhileMutablyBorrowed — the stream is locked
```

Note what is _not_ in the table: `postMessage(value)` without a transfer list
structured-clones its argument, so it is not a move.

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

What types do **not** yet unlock is `Response` body consumption (`res.json()`
after `res.text()`). Consuming a body invalidates `res.body`, not `res.status`,
and the rule moves whole variables — partial moves have to come first.

## Measured on `lib/`

666 files, 235k lines, ESLint 9:

| Configuration        | Findings | Lint time (parse + scope + rule) |
| -------------------- | -------- | -------------------------------- |
| no rules (baseline)  | —        | 4.4 s                            |
| defaults             | **0**    | 5.4 s (+22%)                     |
| `implicitMove: true` | **2872** | 5.6 s                            |

Two results worth keeping:

- With markers and the platform table, the rule is silent on a large real
  codebase — the design goal, since a linter that cries wolf gets switched off.
  The scan is also how the `locksReceiver` prototype-chain bug was found: every
  `x.toString()` was being read as a lock, for 127 findings.
- `implicitMove` produces ~2.9k findings on code that is entirely correct. JS
  passes references by design; assignment is not a move, and no heuristic
  rescues that. It stays opt-in and off.

## Known limits

- Single file. Nothing is tracked across module boundaries.
- Aliasing is not tracked: once a value reaches `arr.push(a)` or `o.child = a`,
  the rule loses it. Unsound by construction, deliberately biased to false
  negatives.
- Closure state is seeded in source order, so a callback written _before_ the
  move but running _after_ it is not caught. Fixing that needs to know when the
  closure escapes, which is the aliasing problem above.
- Destructuring (`const { x } = data`) counts as a read, not a partial move —
  the Rust reading would fire on nearly every real file.
- Loop back-edges are not iterated to a fixed point. `moveInLoop` instead asks
  whether the move's segment can be reached again, so `break` and `return` out
  of the loop are not reported.
- Without type information the platform table matches method names alone, so a
  `getReader` on something that is not a stream is a false positive.
- Moves are whole-variable. There are no partial moves, so a call that
  invalidates one member of an object cannot be modelled.
- Whether a value is a primitive falls back to its initializer's shape when no
  type information is available.

## Running it

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js test/Ironclad.unittest.js
```

or through the wrapper: `yarn test:base --testPathPatterns="Ironclad"`.
