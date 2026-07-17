# Server-Side Rendering (SSR)

This example shows the building blocks webpack provides for server-side rendering, aligned with the SSR features of Vite and Rspack/Rsbuild:

- **`SSRManifestPlugin`** emits `ssr-manifest.json`, mapping each source module to the client assets (JS chunks and CSS) it needs. The server uses it to inject `<link rel="modulepreload">` / stylesheet tags for exactly what it rendered.
- **`__webpack_css_server_styles__`** returns the CSS collected during a server render, so the critical CSS can be inlined into the HTML (no flash of unstyled content).
- **`externalsPresets.nodeModules`** externalizes installed packages from the Node server build, so dependencies are `require`d at runtime instead of bundled.

## Client build

The client build emits the browser assets and the SSR manifest. `page.js` is code-split, so it (and its CSS) become a separate chunk described by the manifest.

# example.js

```javascript
_{{example.js}}_
```

# page.js

```javascript
_{{page.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# dist/ssr-manifest.json

The manifest maps each source module to the client files needed to load it.

```json
_{{dist/ssr-manifest.json}}_
```

## Server usage

The server renders the same components and combines the manifest (for preloads) with the collected critical CSS.

# server.js

```javascript
_{{server.js}}_
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
