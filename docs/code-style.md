# Code style

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps each rule as one line and links here. -->

The full text behind the code conventions in [AGENTS.md](../AGENTS.md#code-conventions): the reasons, examples and exceptions each one-line rule there stands for.

## Naming

Spell names out in full (functions, variables, parameters, properties): `insertHtmlElement` not `insHtmlEl`, `attributeCount` not `attrCnt`, `current` not `cur`, `element` not `el`. Exceptions: abbreviations webpack already uses pervasively (`ast`, `ns`, `id`, `url`, `css`, `js`, `dir`, `env`, `fs`) or spec-defined ones (`afe` — the HTML spec's active formatting elements), and throwaway loop indices (`i`, `j`, `k`). Otherwise write the full word.

**Name a class for what it does, and the file for the class.** The name says the idea, and ends in the suffix its kind uses — `*Plugin`, `*Dependency`, `*RuntimeModule`, `*Warning`, `*Error`, `*Module`, `*Factory`, `*Generator`, `*Parser`, `*Template` (546 of 668 PascalCase files in `lib/`). A file exporting one class takes that name; where the two disagree, rename whichever is wrong — often the file. Exempt: core nouns (`Compiler`, `Chunk`), helper and data-structure modules, and any module exporting several things.

**A name never** invents a role suffix (`lib/` has no `*Controller`, `*Manager`, `*Service` or `*Util` — a class that controls a thing is the thing), carries a `Webpack` prefix where the bare word is free, or repeats another class in `lib/`, since a stack trace and `types.d.ts` show the name alone.

## Path regexps and helpers live in one file

> [!REQUIRED]

`lib/util/identifier.js` is the single home of path-shape regexps (`ABSOLUTE_PATH_REGEXP`, `WINDOWS_ABS_PATH_REGEXP`, `WINDOWS_PATH_SEPARATOR_REGEXP`, …) and the helpers built on them (`parseResource`, `makePathsRelative`, `contextify`, `absolutify`, `getUndoPath`, …). **Import from there — never re-declare a local copy**, even a one-liner like `/^[a-z]:[\\/]/i` or `/\\/g`; duplicates drift into subtly different definitions of "absolute path" or "separator".

Before writing a path-shape regexp, read the top of that file and its `module.exports`. If what you need is defined but not exported, **export and import it**. Define one locally only when nothing fits, next to the single function using it.

## Don't enumerate module or source types

> [!REQUIRED]

A list of module, source or dependency types in `lib/` claims those are all there will ever be; the day one is added it is silently wrong, and the new type takes whichever branch the list forgot. Instead:

- **Ask the object.** `module.getSourceTypes()`, `chunkGraph.getModuleSourceTypes(module)`, `moduleGraph.getParentModule(dependency)` answer for whatever exists, plugin types included. Know `getParentModule`: concatenation re-points an incoming connection at the javascript module absorbing the referencing one, so `connection.originModule.type` reads `javascript` for a css `url()` or html `src`, while the dependency's own module still reads `css`/`html`.
- **Ask the kind, not the class.** `module.is("css")` and `isDependencyKind(dependency, "url")` say what `dependency.type === "new URL()"` only approximates, survive renames and need no `require` of the class; chunks, groups and blocks answer `isHotUpdate()`, `isEntrypoint()` and `isAsyncBlock()`. Keep `instanceof` for built-ins and for telling a class from a plain value. A new kind: [docs/architecture.md](architecture.md#adding-a-dependency-type-or-runtime-requirement).

**A feature flag is the same list in disguise**: gating on `options.experiments.<x>` to mean "which types can exist here" reads like configuration but goes stale the same way.

When a branch must name types, **let an unknown type take the safe side**: name the special case and let the rest fall to the general answer (`typePrefixEquals(type, JAVASCRIPT_TYPE)` … `else` reads the asset url), or list what provably needs nothing and treat the rest as needing it (`TYPES_WITHOUT_CHUNK_HANDLER`). Avoid a list whose `else` does nothing.

## Code comments

> [!REQUIRED]

**A plain comment is at most three lines. Count them.** This binds every `//` and `/* … */` in `lib/`, `hot/`, `tooling/` and `test/`, and every comment a generator emits. A fourth line is over however short or true — split, cut or drop it. `webpack/comment-length` enforces it repo-wide (`lib/` included; `yarn lint:code` shows it, over whole files, reading comment tokens only, so comment-like text in strings doesn't count) and fails `lint`. Only `examples/` is exempt: a commented-out config there is what readers copy, and the prose is the example's documentation.

**Three things are exempt, none of them commentary**: JSDoc (a type contract); the block before a file's first statement (documents the file like the license header — a `"use strict"` between them doesn't end it); and a comment whose first line opens `// WHY:`, stating why code is shaped as it is — spec prose behind a `SUPPLEMENT` entry, a measured engine disagreement, a constraint another file depends on — which can't be shortened without loss:

```js
// WHY: Chromium reads an Oklch hue as missing well before the chroma reaches
// zero — measured: kept at 0.02, dropped at 0.015 — where CSS Color 4 §4.4
// makes it powerless only at zero. So a color in that band has no answer two
// engines agree on, and a mix naming one is left as it stands.
```

`WHY:` is not a way to keep a long comment: use it only when every line carries something the code can't, and expect a reviewer to ask which line that is (`grep -rn "// WHY:"` shows how often it's used).

Each surviving line must carry what code can't: a hidden invariant, an ordering constraint, a workaround, or the name of the concept implemented. **Never** restate the next line, narrate the diff, recap the PR, or quote your task.

**JSDoc tags are exempt**, multi-line by construction. Every named function gets a block, module-scope helpers included: one `@param` per parameter, `@returns`, `@template`/`@typedef` where they apply. Never shorten, flatten or delete a tag, and never trade a JSDoc block for a `//` comment plus an inline `/** @type {T} */` cast (that loses parameter and return docs; such casts are for throwaway callback arguments only).

**The description above the tags is prose, capped at two sentences**: what the function does when its name doesn't say, plus the one constraint a caller needs. An essay moved from `//` into JSDoc is the same essay; algorithm explanations, history and alternatives belong in neither. Prose about a documented symbol goes inside its JSDoc, never as a `//` comment above or instead of it.

## Marking work for the next major

> [!REQUIRED]

Work waiting for the next breaking release uses one wording, in every file type:

```js
// TODO in the next major release: remove, `css-url` is the old spelling of `asset-url`
```

**Never name a version**, in the marker or the prose beside it (`TODO webpack 6`, `TODO remove in webpack 6`, `TODO webpack6 - …`, `TODO webpack@6`, `TODO reconsider this for webpack 6` — one cleanup got written a dozen unsearchable ways). A number goes stale when that major ships and the work slips to the next; a `@deprecated` tag or description of what the next major does takes the same phrase.

**Always say what to do** — a bare marker tells the branch doing the work nothing. It is a plain comment, so the [three-line limit](#code-comments) applies. The whole list is then one command, which is the point of the single wording:

```sh
grep -rn "TODO in the next major release" codecov.yml bin hot lib setup test tooling
```

## Target the Node baseline

`lib/` and `hot/` ship as raw source (no build step) and must run on **Node ≥ 10.13** (CI goes down to 10.x): no newer syntax or APIs, e.g. no `?.` or `??`, or it passes locally and fails the Node 10 job.

**This covers what tests execute too.** The harness runs each `configCases/` bundle, and webpack doesn't transpile fixtures (`output.environment` constrains only generated code), so a fixture using newer syntax — class static fields/blocks, `??=`, `await using` — fails the Node 10 job with a bare `SyntaxError` in the emitted bundle. When the syntax _is_ the point, gate the case with a `test.filter.js` returning `false` below the first supporting version, naming the syntax in a comment:

```js
"use strict";

// The fixture observes the name from a class static field, which Node 10
// cannot parse when the harness executes the bundle.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".")[0]);
	return major >= 12;
};
```

Otherwise write it in baseline syntax so it runs everywhere. This capability gate is unrelated to the cache-suite silencing [AGENTS.md forbids](../AGENTS.md#the-persistent-cache-has-to-keep-working) — a filtered case still runs in both suites wherever it can execute.
