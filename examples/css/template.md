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

The config also registers a small plugin that reads each CSS module's name map
(original class/id name -> generated scoped name) from
`module.buildInfo.cssData.exports` and writes it to a JSON sidecar — the
native-CSS equivalent of the postcss-modules `getJSON` callback. Lightning CSS
exposes the same data as the `exports` value returned from `transform()`; webpack
exposes it as data too, so no callback option is needed.

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

# dist/style.module.css.json

The CSS Modules name map emitted by the plugin — the same shape postcss-modules
passes to its `getJSON` callback.

```json
_{{dist/style.module.css.json}}_
```

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
