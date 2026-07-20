# Resource hints

This example gathers every way to configure `<link rel="preload">` /
`<link rel="prefetch">` / `<link rel="modulepreload">` emission in one place.
Each scenario is a separate compiler in the `webpack.config.js` array; pick
the one that fits your app and copy from it.

Two surfaces are involved:

- `output.resourceHints` — controls the **initial chunk graph** hints emitted
  into an HTML entry's `<head>` (or exposed on `stats.entrypoints[name].resourceHints`
  for SSR frameworks).
- `module.parser.<type>.urlHints` — controls per-**URL-referenced-asset**
  defaults (fonts, images, workers) for `new URL(...)`, CSS `url(...)`,
  HTML `<img src>`, etc. Per-URL `webpackPreload` / `webpackPrefetch` magic
  comments still win. `output.urlHints` is a project-wide shorthand that seeds
  the same list under every parser at once.

## Scenarios

1. **auto** — `output.resourceHints: true`. Auto-emit
   `<link rel="modulepreload">` (ESM) or `<link rel="preload" as="script">`
   (classic) for the HTML entry's initial dependency chunks.
2. **prefetch** — `output.resourceHints: "prefetch"`. Same as above but with
   `<link rel="prefetch">` (idle-time hint).
3. **custom-array** — `output.resourceHints: [{...}, ...]`. Supply your own
   `<link>` list (preconnect, custom font, chunk/entry references).
4. **callback** — `output.resourceHints: fn`. One hook that receives the auto
   `defaultHints` plus `{ entryName, entrypoint, hostType, compilation }` and
   returns the final list. Each hint carries `hostChunks` (the referencing chunk
   names — Vite's `hostId`) so you can rewrite per origin chunk. Replaces both
   the old `chunks: fn` and `resolveDependencies` hooks; runs for HTML pages
   (`hostType === "html"`) and JS-only entries (`hostType === "js"`).
5. **url-hints** — `module.parser.javascript.urlHints`. Rule-based
   `preload`/`prefetch` defaults for JS `new URL(...)` references. Same
   shape works under `parser.css.urlHints` (CSS `url(...)`) and
   `parser.html.urlHints` (HTML `<img src>` / `<link href>`).
6. **url-hints-scoped** — `module.rules[].parser.urlHints`. Because parser
   options are scope-aware, a rule can narrow `urlHints` to a subtree
   (e.g. critical routes upgrade `prefetch` → `preload`).
7. **ssr** — `output.resourceHintsManifest` + `output.resourceHints`. JS-only
   build; hints are written to a JSON file (`{ [entry]: descriptors }`) and are
   also on `stats.entrypoints[name].resourceHints`. The server renders them into
   the initial HTML shell.
8. **font-preload** — `module.parser.css.fontPreload: true`. Auto-emit
   `<link rel="preload" as="font">` for the primary `@font-face` `src` in the
   initial CSS. Only the first url per `@font-face` is preloaded.
9. **none** — `output.resourceHints: "none"`. Hard off switch: no `<link>`
   anywhere and empty stats / manifest. (`false` only disables the auto chunk
   hints; URL-asset hints keep firing.)
10. **url-hints-global** — `output.urlHints`. Project-wide shorthand for the
    same `urlHints` list under every parser (JS / CSS / HTML). Parser-scoped
    rules and magic comments still override it.

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# src/routes/home.js

```javascript
_{{src/routes/home.js}}_
```

# src/routes/home-with-assets.js

```javascript
_{{src/routes/home-with-assets.js}}_
```

# src/routes/home-with-css.js

```javascript
_{{src/routes/home-with-css.js}}_
```

# src/styles/app.css

```css
_{{src/styles/app.css}}_
```

# SSR: the manifest file

With `output.resourceHintsManifest: "ssr-hints.json"`, webpack writes the
manifest for you during the build — no stats plumbing needed:

```js
// dist/ssr/ssr-hints.json
const manifest = require("./dist/ssr/ssr-hints.json");
// { "home": [ { rel, href, as?, type?, media?, fetchPriority? }, ... ], "product": [ ... ] }
```

Prefer computing it in-process (e.g. custom filtering)? The same data is on
`stats.entrypoints[name].resourceHints`:

```js
const webpack = require("webpack");
const fs = require("fs");

webpack(require("./webpack.config").find((c) => c.name === "ssr"), (err, stats) => {
  if (err || stats.hasErrors()) return console.error(err || stats.toJson().errors);

  const json = stats.toJson({
    all: false,
    entrypoints: true,
    chunkGroupResourceHints: true
  });
  const manifest = {};
  for (const [name, ep] of Object.entries(json.entrypoints)) {
    manifest[name] = ep.resourceHints || [];
  }
  fs.writeFileSync("dist/ssr/hints.json", JSON.stringify(manifest, null, 2));
});
```

Server:

```js
const escape = (s) => String(s).replace(/"/g, "&quot;");

const renderHint = (h) => {
  const attrs = [];
  if (h.as) attrs.push(`as="${escape(h.as)}"`);
  if (h.type) attrs.push(`type="${escape(h.type)}"`);
  if (h.media) attrs.push(`media="${escape(h.media)}"`);
  if (h.fetchPriority) attrs.push(`fetchpriority="${escape(h.fetchPriority)}"`);
  return `<link rel="${h.rel}" href="${escape(h.href)}"${attrs.length ? " " + attrs.join(" ") : ""}>`;
};

app.get("/product/:id", (req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    ${(manifest.product || []).map(renderHint).join("\n    ")}
    <title>Product</title>
  </head>
  <body>
    <div id="root">${renderToString(<App id={req.params.id} />)}</div>
    <script type="module" src="/static/product.js"></script>
  </body>
</html>`);
});
```

# Async chunks

`output.resourceHints` and `module.parser.<type>.urlHints` cover the
**initial** graph only. Hints for chunks loaded via `import()` are their
own subsystem — use `module.parser.javascript.dynamicImportPrefetch` /
`dynamicImportPreload` / `dynamicImportFetchPriority`, or per-call
`/* webpackPrefetch: true */` magic comments. Those route through
webpack's existing on-demand chunk-load runtime.

# Precedence

Highest wins:

1. Per-URL magic comment (`webpackPreload: true`, `webpackAs: "font"`, …)
2. `module.parser.<type>.urlHints` rule match
3. Nothing (no hint emitted for that URL)

For chunk hints, `output.resourceHints` is a single source of truth — the
callback form receives auto defaults and can filter / add / rewrite them
however you need.

# Info

## webpack output

```
_{{stdout}}_
```
