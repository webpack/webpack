# example.js

```javascript
_{{example.js}}_
```

# style.css

```css
_{{style.css}}_
```

# style.module.css

```css
_{{style.module.css}}_
```

# webpack.config.js

The config also registers a small plugin that gives CSS modules **TypeScript
types**. It reads each CSS module's name map (original class/id name ->
generated scoped name) from `module.buildInfo.cssData.exports` — the same data
webpack uses to build the JS exports, and the same data Lightning CSS returns as
`exports` from `transform()` — and writes a `.d.ts` **next to the source file**
so editors and `tsc` type `import … from "./x.module.css"`. No bundler ships
this natively today; the map webpack already computes makes it a few lines.

```javascript
_{{webpack.config.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# dist/output.css

```javascript
_{{dist/output.css}}_
```

## production

```javascript
_{{production:dist/output.css}}_
```

# dist/1.output.css

```javascript
_{{dist/1.output.css}}_
```

# style.module.css.d.ts

The plugin writes this declaration **next to the CSS source** (not into `dist`),
so it is picked up automatically by your editor and by `tsc`:

```typescript
_{{style.module.css.d.ts}}_
```

With it in place, the import in `example.js` is fully typed — `main` is a
`string`, a name that is not in the CSS is a compile error, and the editor
autocompletes the class names:

```typescript
import { main } from "./style.module.css"; // main: string
```

Wiring it into a real project: run the build (or `webpack --watch`) so the
`.d.ts` files stay in sync with the CSS, then either commit them or add
`*.module.css.d.ts` to `.gitignore`. Because the declaration lives beside the
source, no `paths`/ambient-module setup is needed.

# What native CSS scopes (CSS Modules)

webpack's native CSS localizes more identifiers than any classic loader. For a
`css/module` (or auto-detected `*.module.css`):

- **Always:** class (`.foo`) and id (`#foo`) selectors.
- **Explicit, per parser option (all default `true`):** `@keyframes` +
  `animation-name` (`animation`), grid line/area names (`grid`),
  `@counter-style` + `list-style` (`customIdents`), `@container` +
  `container-name` (`container`), `@function` names + calls (`function`),
  `view-transition-name`/`-group`/`-class` + `::view-transition-*()` pseudo
  arguments (`customIdents`).
- **Auto (any `--foo` dashed ident, via `dashedIdents`, default `true`):** custom
  properties and `var(--foo)` incl. cross-file `var(--foo from "./x.css")` and
  `from global`; `@property` / `@font-palette-values` / `@color-profile` names;
  anchor positioning (`anchor-name`, `position-anchor`, `anchor()`,
  `@position-try`, `anchor-scope`); scroll-driven-animation names; and
  `@container style(--foo)` queries. New dashed-ident CSS features are covered
  automatically, with no feature-specific code.
- **Composition / values:** `composes` (same-file, `from "./x.css"`,
  `from global`), `@value` (incl. cross-file), ICSS `:import` / `:export`.

Intentionally left **global** (they coordinate across documents or the whole
app, so scoping would break them): `@layer` and `@page` names,
`@font-feature-values` family names, `@view-transition` `types`, and
`:global(...)` selectors.

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
