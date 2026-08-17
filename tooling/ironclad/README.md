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
| `moveWhileBorrowed`       | moved while a borrow is still live                                     |
| `useWhileMutablyBorrowed` | the owner is touched while a `@borrowMut` view is live                 |
| `mutationWhileShared`     | the owner is mutated while a `@borrow` view is live                    |
| `conflictingBorrow`       | a second borrow conflicts with a live one (`&mut` excludes everything) |
| `borrowEscapes`           | a borrow is stored somewhere that outlives the owner                   |

Branches are handled through ESLint's code-path events: a value moved in one arm
of an `if` is still usable in the other, and moved after the merge point.

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
	// Calls that consume their arguments. `postMessage` really does detach
	// everything in its transfer list, so this needs no annotation.
	moveOnCall: ["postMessage"]
}]
```

## Measured on `lib/`

666 files, 235k lines, ESLint 9:

| Configuration        | Findings | Lint time (parse + scope + rule) |
| -------------------- | -------- | -------------------------------- |
| no rules (baseline)  | —        | 4.4 s                            |
| defaults             | **0**    | 5.4 s (+22%)                     |
| `implicitMove: true` | **2462** | 5.4 s                            |

Two results worth keeping:

- With markers only, the rule is silent on a large real codebase — the design
  goal, since a linter that cries wolf gets switched off.
- `implicitMove` produces ~2.5k findings on code that is entirely correct. JS
  passes references by design; assignment is not a move, and no heuristic
  rescues that. It stays opt-in and off.

## Known limits

- Single file, single function. Nothing is tracked across module boundaries.
- Aliasing is not tracked: once a value reaches `arr.push(a)`, `o.child = a` or
  a closure, the rule loses it. Unsound by construction, deliberately biased to
  false negatives.
- Destructuring (`const { x } = data`) counts as a read, not a partial move —
  the Rust reading would fire on nearly every real file.
- Loop back-edges are not iterated to a fixed point; `moveInLoop` catches the case
  syntactically instead.
- Whether a value is a primitive is inferred from its initializer. Real type
  information would replace that heuristic.

## Running it

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js test/Ironclad.unittest.js
```

or through the wrapper: `yarn test:base --testPathPatterns="Ironclad"`.
