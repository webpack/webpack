This example shows **module / nomodule differential serving** on top of the
experimental HTML modules support (`experiments.html`), coordinated with the
`output.html` `alterAssetTags` hook.

Two builds run as a `MultiCompiler` array:

- **`modern`** — `output.module: true`, so the HTML entry's
  `<script type="module">` is emitted for browsers that support ES modules.
  This build owns the emitted `dist/index.html`.
- **`legacy`** — a classic (non-module) bundle for browsers without ES module
  support. In a real project this build (only this one) runs the source through
  a transpiling loader (babel / swc) with old `targets`.

The `NoModuleFallbackPlugin` taps `alterAssetTags` on the modern build and
injects two tags into the page: the classic bundle as
`<script nomodule defer src="app.legacy.js">`, and the standard Safari 10.1
`nomodule` fix (Safari 10.1 supports modules but not the `nomodule` attribute,
so without the fix it would run both bundles).

At runtime the browser picks exactly one bundle: modern engines run the
`type="module"` script and ignore `nomodule`; legacy engines skip the module
script and run the `nomodule` fallback.

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

# dist/index.html

The emitted page, with the modern `type="module"` entry tag plus the injected
`nomodule` fallback and the Safari fix.

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
