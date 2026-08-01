# Server-Side Rendering (SSR)

Two builds from one source tree — a browser bundle and a Node bundle that renders the same route to HTML — using the SSR building blocks webpack provides:

| Feature                                              | What it does                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SSRManifestPlugin`                                  | Emits `ssr-manifest.json`: source module → the client files needed to run it, so the server can preload exactly what it rendered.             |
| `ManifestPlugin`                                     | Emits `manifest.json`: emitted asset → its source, plus the entrypoint graph, for asset pipelines and backend templating.                     |
| `__webpack_css_server_styles__`                      | The CSS collected while rendering without a DOM, ready to inline as critical CSS.                                                            |
| `externalsPresets: { node, nodeModules }`            | Keeps node builtins and installed packages out of the server bundle; `allowlist` bundles individual packages anyway.                          |
| `generator: { emit: false }`                         | The server build resolves asset URLs without writing the files a second time — the client build already emitted them.                        |
| `import.meta.env.*`                                  | `MODE` / `DEV` / `PROD` / `BASE_URL`, plus `SSR` (`true` in a `target: "node"` build) to drop server-only code from the browser bundle.       |

The server build targets the neutral `["web", "node"]` platform: the runtime guards browser APIs behind `typeof document === "undefined"`, which is what lets the CSS runtime collect styles instead of writing them into a document that is not there.

# example.js

```javascript
_{{example.js}}_
```

# page.js

```javascript
_{{page.js}}_
```

# server.js

```javascript
_{{server.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# dist/client/ssr-manifest.json

Keyed by source module. `./page.js` lists its own chunk, its CSS, and any chunk it depends on.

```json
_{{dist/client/ssr-manifest.json}}_
```

# dist/client/manifest.json

Keyed by emitted asset, with the entrypoint graph alongside it.

```json
_{{dist/client/manifest.json}}_
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
