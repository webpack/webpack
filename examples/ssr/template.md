# Server-Side Rendering (SSR)

Two builds from one source tree — a browser bundle and a Node bundle that renders the same route to HTML — using the SSR building blocks webpack provides:

| Feature                                              | What it does                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SSRManifestPlugin`                                  | Emits `ssr-manifest.json`: source module → the client files needed to run it, so the server can preload exactly what it rendered.             |
| `ManifestPlugin`                                     | Emits `manifest.json`: emitted asset → its source, plus the entrypoint graph, for asset pipelines and backend templating.                     |
| `__webpack_css_server_styles__`                      | The CSS collected while rendering without a DOM, ready to inline as critical CSS.                                                            |
| `externalsPresets: { node, nodeModules }`            | Keeps node builtins and installed packages out of the server bundle; `allowlist` bundles individual packages anyway.                          |
| `generator: { emit: false }`                         | The server build resolves asset URLs without writing the files a second time — the client build already emitted them.                        |
| `generator.css.exportsOnly`                          | Defaults to `true` on a document-less target, so a server build emits no stylesheets at all; set it to `false` to write them anyway.          |
| `import.meta.env.*`                                  | `SSR` is `true` in this `target: "node"` build and `false` in the client one, so server-only branches leave the browser bundle. Also `MODE` / `DEV` / `PROD` / `BASE_URL`. |

The server build targets `node`, so webpack knows there is no DOM: `import.meta.env.SSR` folds to `true`, and the CSS runtime collects the styles instead of linking them into a page. It opts back into emitting stylesheets (`exportsOnly: false`) only because the collected CSS is read back from them; leave the default on and the server build writes no CSS at all.

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
