# CSS Modules scoping registry

Reference for **what webpack's native CSS (`experiments.css`, module types
`css/module` / `css/auto` / `css/global`) localizes** in CSS Modules mode, and
what it deliberately leaves global. Implementation lives in
[`CssParser.js`](./CssParser.js); the scoped-name generation lives in
[`../dependencies/CssIcssExportDependency.js`](../dependencies/CssIcssExportDependency.js).

The point of this doc: keep "stay ahead on scoping" a checklist, not a guess.
When a new CSS feature with named identifiers appears, use the
[decision guide](#adding-scoping-for-a-new-css-feature) below.

## Always scoped (local mode)

| Name                  | Notes                       |
| --------------------- | --------------------------- |
| class selector `.foo` | also the `composes:` anchor |
| id selector `#foo`    |                             |

## Scoped via explicit at-rule / property handling

Each is gated by a parser option (all default **`true`**); the reference is
rewritten to match the definition.

| Name                                                                                                                           | Gate option    |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `@keyframes` + `animation` / `animation-name`                                                                                  | `animation`    |
| grid line / area names (`grid-template-*`, `grid-*`)                                                                           | `grid`         |
| `@counter-style` + `list-style` / `system` / `fallback` refs                                                                   | `customIdents` |
| `@container` + `container` / `container-name`                                                                                  | `container`    |
| `@function` names + calls                                                                                                      | `function`     |
| `view-transition-name` / `-group` / `-class` + `::view-transition-group()` / `-image-pair()` / `-old()` / `-new()` pseudo args | `customIdents` |

## Auto-scoped via the blanket dashed-ident scanner

Gated by `dashedIdents` (default **`true`**). **Any `--foo` dashed ident** — in a
declaration name or value, inside `var()` / `style()`, or in an at-rule prelude —
is scoped with **no feature-specific code**. This is why webpack covers new
dashed-ident CSS features the day they ship. Currently that includes:

- custom-property declarations `--foo:` and `var(--foo)` references, incl.
  cross-file `var(--foo from "./x.css")` and `var(--foo from global)`
- `@property`, `@font-palette-values`, `@color-profile` prelude names
- anchor positioning: `anchor-name`, `position-anchor`, `anchor()`,
  `@position-try`, `anchor-scope`
- scroll-driven animations: `scroll-timeline-name`, `view-timeline-name`,
  `timeline-scope`, `animation-timeline`
- `@container style(--foo)` query custom properties

Regression coverage: `test/configCases/css/dashed-idents-scoping`.

## Composition / values

| Feature                                                 | Gate         |
| ------------------------------------------------------- | ------------ |
| `composes` (same-file, `from "./x.css"`, `from global`) | modules mode |
| `@value` (incl. cross-file `@value x from "./y"`)       | modules mode |
| ICSS `:import` / `:export`                              | modules mode |

## Intentionally NOT scoped (global by design)

These name identifiers coordinate across documents, across the whole app, or
outside CSS Modules, so scoping would break them. Matches Lightning CSS.

| Name                                | Why global                                  |
| ----------------------------------- | ------------------------------------------- |
| `@layer` names                      | cascade layers are app-wide                 |
| `@page` names                       | print, coordinated outside CSS Modules      |
| `@font-feature-values` family names | font families, referenced by `font-family`  |
| `@view-transition` `types`          | cross-document view-transition coordination |
| `:global(...)` selectors            | explicitly opted out of scoping             |

## Parser options

Modules-capable types (`css/module`, `css/auto`, `css/global`) default all of
these to `true`: `animation`, `container`, `customIdents`, `dashedIdents`,
`function`, `grid`, plus `customMedia` / `customSelectors` (build-time
substitution, not scoping). `defaultMode` is `"pure"`; `pure` strict mode is
opt-in. See `schemas/WebpackOptions.json` (`CssParser*` definitions).

## Adding scoping for a new CSS feature

1. **Dashed ident (`--foo`)** → already covered by the blanket `dashedIdents`
   scanner. Do **not** add code; add a regression case to
   `test/configCases/css/dashed-idents-scoping` so the coverage is locked in.
2. **Non-dashed custom ident referenced within the same file's CSS** (like
   `view-transition-name` ↔ its pseudos) → add the property to the
   known-properties table in `CssParser.js` (gated on `customIdents`) and scope
   its references too, then test definition/reference consistency.
3. **Name that coordinates across documents / outside CSS** (layer, page,
   view-transition types) → leave it global and add a row to
   [Intentionally NOT scoped](#intentionally-not-scoped-global-by-design) so the
   decision is explicit.
