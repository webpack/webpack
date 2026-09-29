# Options

<!-- Moved out of AGENTS.md so it loads only when needed; AGENTS.md keeps a pointer here. -->

## Adding or renaming a webpack option

Every option touches every layer, in order — skipping one silently breaks the option:

1. **Type** — `declarations/WebpackOptions.ts` for a configuration option, or the JSDoc typedefs in the `lib/` module reading it for a plugin's, which `yarn fix:special` turns into the schema.
2. **Defaults** — `lib/config/defaults.js`.
3. **Normalization** — `lib/config/normalization.js`.
4. **Implementation** — where the option is consumed.
5. **Generated output and snapshots** — run `yarn fix:special` (so `lib/` can reference the new types), then update the snapshots the option's _name_ leaks into, which no `configCases/` pattern matches:
   - `test/__snapshots__/Cli.basictest.js.snap` — CLI flags derive from the schema; every property adds one.
   - `test/configCases/ecmaVersion/browserslist*/webpack.config.js` — **inline** snapshots of the resolved `output.environment`: one entry across nine config files.
   - `test/unitCases/__snapshots__/target-browserslist.unittest.js.snap` — same, per browserslist query.
   - `test/unitCases/Defaults.unittest.js` — **inline** snapshots of the whole resolved config (base defaults plus once per browserslist fixture), so an `output.environment` property adds a line to each. Runs in the `unit` flag, which no `configCases` or `basic` run reaches.
   - `test/unitCases/Validation.unittest.js` — **inline** snapshots quote the "these properties are valid" list, so a new `module.rules` property changes one. Runs in the `unit` matrix, not `basic`.

Consider updating `examples/` and running `yarn build:examples` after adding or modifying options.

**`normalization.js`** canonicalizes the user's config shape (shorthand → full form); **`defaults.js`** fills values (often mode/target-dependent). Edit whichever matches.

## Documentation keywords

**Documentation keywords are written as JSDoc tags**, and the schema states what they say:

- `@since <version>` → `"added"`: the first webpack version shipping the option. An unreleased option gets the upcoming version (`package.json` version with pending changesets applied — on `5.108.x` with minor changesets pending, `@since 5.109.0`).
- `@experimental` → `"experimental"`, for `experiments` options or others subject to breaking changes.

They are documentation only (stripped from precompiled validators). A pure `$ref` property can't carry them — annotate the referenced definition. A keyword cannot sit after a `@property` line either, where a stray tag ends the property list: a property carrying one is a named typedef tagged `@inline`, whose body the schema puts back where the reference was.

## What a schema may say

**What a schema may say is the lint rule's job, not the generator's.** `webpack/valid-schema` rejects extra keys beside a `$ref`, any `minLength` but `1`, and an `enum` holding non-primitives (the validator emits no other length check and compares nothing else); `yarn lint:code` reports them at the key, and the generator assumes they hold.
