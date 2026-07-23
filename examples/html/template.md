This example demonstrates the experimental HTML modules support
(`experiments.html`) in two ways:

- **HTML entry point** (`./src/index.html`): emitted as a standalone
  `dist/index.html`. Its `<link rel="stylesheet">`, inline `<style>`,
  `<script src>`, inline `<script>`, `<img src>` and `<img srcset>` are all
  bundled, and the references are rewritten to the emitted assets.
- **HTML imported from JavaScript**: the page's `<script src="./app.js">`
  imports `./src/fragment.html`. An HTML module imported from JS exports its
  URL-rewritten HTML as a string and is _not_ emitted as a standalone file.
  There is no JavaScript entry point — the script is reached through the HTML.

It also shows how to **generate a modern favicon set and web app manifest, and
inject them** — without that being a core feature. `GenerateFaviconPlugin` builds
a `favicon.ico`, an `apple-touch-icon`, `192`/`512` manifest icons and a
`manifest.webmanifest` from `src/logo.png`, and caches the whole set with
`compilation.getCache()` keyed by the source's content hash — so the generation
only reruns when the logo changes. (Resizing to each size is the one step a real
plugin does with an image library like sharp/jimp; the example keeps the bytes
as-is so it needs no dependency.) It then injects the `<link rel="icon">`,
`<link rel="apple-touch-icon">`, `<link rel="manifest">` and
`<meta name="theme-color">` tags into every emitted page through the
`output.html` `injectTags` hook.

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

# src/fragment.html

```html
_{{src/fragment.html}}_
```

# src/styles.css

```css
_{{src/styles.css}}_
```

# dist/index.html

The HTML entry point, emitted as a standalone file with every reference
rewritten to the bundled asset.

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
