This example demonstrates automatic **Content-Security-Policy** generation for
the experimental HTML modules support (`experiments.html`), via
`output.html.csp`.

Two `output.html` options combine:

- **`inline: true`** inlines every emitted chunk into the page, so the external
  `<link rel="stylesheet">` and `<script src>` become inline `<style>` /
  `<script>` tags alongside the ones already inline in the source.
- **`csp: true`** injects a `<meta http-equiv="Content-Security-Policy">` with a
  strict baseline (`script-src`/`style-src 'self'`, `object-src 'none'`,
  `base-uri 'self'`) and appends a `sha256` hash of **every** inline
  `<script>`/`<style>` — computed after inlining, so each hash matches the exact
  bytes the browser executes. Anything left external is covered by `'self'`.

No CSP plugin is involved. Passing an object instead of `true` can add a
per-request `nonce` or override individual directives via `policy` (e.g.
`{ policy: { "img-src": ["'self'", "data:"] } }`); an author-declared CSP in the
page is left untouched.

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

The emitted page: every script/style inlined, with the generated CSP `<meta>`
carrying a hash for each one.

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
