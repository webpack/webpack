# Server-Side Rendering (SSR)

A React app rendered on the server and hydrated in the browser, from one source tree and two webpack builds.

The problem it exists to show: the route is code-split, so its stylesheet travels with a chunk the browser has not asked for yet. React renders that route's markup during SSR anyway, so without help the HTML arrives styled by the entry's CSS alone and the route flashes unstyled until hydration pulls its chunk down. `SSRManifestPlugin` closes that gap — it says which client files each source module needs, so the server can name the route's stylesheet in the document it is already writing.

## Running it

```sh
yarn webpack --config webpack.config.js
node dist/server/main.mjs
```

Two routes render the same page different ways, which is the point of the example:

| URL                          | How the route's CSS gets there                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `http://localhost:3000`       | `<link rel="stylesheet">` named by the SSR manifest. The client runtime **adopts** that link when it loads the chunk rather than requesting the file again. |
| `http://localhost:3000/inline` | Inlined from `__webpack_css_server_styles__`, the CSS collected while rendering without a DOM. |

## The pieces

| Feature                                   | What it does                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `SSRManifestPlugin`                       | Emits `ssr-manifest.json`: source module → the client files needed to run it, so the server can name exactly what it rendered.               |
| `ManifestPlugin`                          | Emits `manifest.json`: emitted asset → its source, plus the entrypoint graph, for asset pipelines and backend templating.                     |
| `__webpack_css_server_styles__`           | The CSS collected while rendering without a DOM, ready to inline as critical CSS.                                                            |
| `__webpack_public_path__`                 | Locates the emitted bundle at runtime. `import.meta.url` in module code is the **source** module's url, so it cannot do this.                 |
| `externalsPresets: { node, nodeModules }` | Keeps node builtins and installed packages out of the server bundle; `allowlist` bundles individual packages anyway.                          |
| `generator: { emit: false }`              | The server build resolves asset URLs without writing the files a second time — the client build already emitted them.                        |
| `generator.css.exportsOnly`               | Defaults to `true` on a document-less target, so a server build emits no stylesheets at all; set it to `false` to write them anyway.          |
| `import.meta.env.*`                       | `SSR` is `true` in this `target: "node"` build and `false` in the client one, so server-only branches leave the browser bundle. Also `MODE` / `DEV` / `PROD` / `BASE_URL`. |

The server build targets `node`, so webpack knows there is no DOM: `import.meta.env.SSR` folds to `true`, and the CSS runtime collects the styles instead of linking them into a page. It opts back into emitting stylesheets (`exportsOnly: false`) only because the collected CSS is read back from them; leave the default on and the server build writes no CSS at all.

## Two things to know before copying this

**Set `output.publicPath` explicitly.** The default `"auto"` is resolved in the browser from the script url, which a manifest written at build time cannot do. `SSRManifestPlugin` falls back to `/` and warns: served from anywhere else, the urls the server prints are not the ones the client runtime builds, so nothing is adopted and every stylesheet is fetched a second time.

**`__webpack_css_server_styles__` is a process-wide registry, not a per-request one.** It accumulates every chunk the process has loaded, and it holds no initial stylesheet — only what chunk loading pulled in. That is why `/inline` still links the entry's stylesheet, and why inlining suits a per-route render more than a long-lived shared process.

# example.js

```javascript
_{{example.js}}_
```

# App.js

```javascript
_{{App.js}}_
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
