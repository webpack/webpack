This example demonstrates the `output.html` **`transformTags`** hook on top of
the experimental HTML modules support (`experiments.html`).

`transformTags` hands a plugin the page's already-present
`<script>`/`<link>`/`<style>`/`<meta>` tags as mutable descriptors. It covers
all three ways to change an existing tag:

- **Mutate `attrs`** — `TransformTagsPlugin` adds `crossorigin="anonymous"` to
  every external `<script>`/`<link rel="stylesheet">`.
- **Change `injectTo`** — it moves the render-blocking `<script>` authored in
  `<head>` to the end of `<body>` and marks it `defer`.
- **Set `remove: true`** — it drops the dev-only `<meta name="debug">` from the
  shipped page.

Webpack rewrites only the changed tags; untouched tags stay byte-for-byte. To
add brand-new tags (a favicon, a `nomodule` fallback, …) use the sibling
`injectTags` hook instead — see the `html` and `html-module-nomodule` examples.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# src/index.html

```html
_{{src/index.html}}_
```

# src/app.js

```javascript
_{{src/app.js}}_
```

# src/styles.css

```css
_{{src/styles.css}}_
```

# dist/index.html

The emitted page: the debug `<meta>` gone, `crossorigin` on the stylesheet, and
the script moved to the end of `<body>` as `<script defer>`.

```html
_{{dist/index.html}}_
```

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
