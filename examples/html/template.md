This example demonstrates the experimental HTML modules support
(`experiments.html`) in two ways:

- **HTML entry point** (`./src/index.html`): emitted as a standalone
  `dist/index.html`. Its `<link rel="stylesheet">`, inline `<style>`,
  `<script src>`, inline `<script>`, `<img src>` and `<img srcset>` are all
  bundled, and the references are rewritten to the emitted assets.
- **HTML imported from JavaScript** (`./src/app.js` imports
  `./src/fragment.html`): the HTML module exports its URL-rewritten HTML as a
  string and is _not_ emitted as a standalone file.

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
