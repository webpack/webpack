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
import "./style.css";

if (import.meta.env.DEV) {
	console.log("client bundle, mode:", import.meta.env.MODE);
}

// `page.js` is code-split; the SSR manifest maps it to the client assets
// (its JS chunk and CSS) to preload when it is rendered on the server.
import("./page.js").then(({ render }) => {
	document.body.innerHTML = render();
});
```

# page.js

```javascript
import "./page.css";

export function render() {
	return '<h1 class="headline">Hello from server-side rendering</h1>';
}
```

# server.js

```javascript
import { readFileSync } from "node:fs";

// The Node half of the app: it renders the route to HTML and consumes the
// client build's artifacts. Read at request time so a rebuilt client is picked
// up without restarting the server.
const manifest = JSON.parse(
	readFileSync("dist/client/ssr-manifest.json", "utf8")
);

export async function renderDocument() {
	// The route is code-split, so only its modules load here — and only their
	// CSS ends up in the collected styles below.
	const { render } = await import("./page.js");
	const body = render();

	// CSS collected while rendering without a DOM; empty in the browser, where
	// the same runtime puts the styles into the document instead.
	const criticalCss = __webpack_css_server_styles__;

	// Exactly the client files the rendered module needs, including the chunks
	// it depends on — without them the browser would discover them one round
	// trip too late.
	const files = manifest["./page.js"] || [];
	const tags = files
		.map((file) =>
			file.endsWith(".css")
				? `<link rel="stylesheet" href="${file}">`
				: `<link rel="modulepreload" href="${file}">`
		)
		.join("");

	return `<!doctype html>
<html>
	<head>
		${tags}
		<style>${criticalCss}</style>
	</head>
	<body>${body}</body>
</html>`;
}
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const client = {
	name: "client",
	target: "web",
	entry: "./example.js",
	output: {
		path: path.resolve(__dirname, "dist/client"),
		filename: "[name].js",
		// baked into the manifests, so the server emits URLs it never has to rewrite
		publicPath: "/dist/client/"
	},
	optimization: {
		chunkIds: "named" // keep filenames stable across modes (for this example)
	},
	plugins: [
		// source module -> the client files needed to run it, for the server to preload
		new webpack.SSRManifestPlugin(),
		// emitted asset -> its source, plus the entrypoint graph, for asset pipelines
		new webpack.ManifestPlugin()
	]
};

/** @type {import("webpack").Configuration} */
const server = {
	name: "server",
	// neutral platform: browser APIs are guarded at runtime, so the CSS runtime
	// collects the styles instead of touching a DOM that is not there
	target: ["web", "node"],
	entry: "./server.js",
	output: {
		path: path.resolve(__dirname, "dist/server"),
		filename: "[name].mjs",
		chunkFilename: "[name].mjs",
		library: { type: "module" }
	},
	// keep node builtins and installed packages out of the server bundle; add
	// `allowlist` to bundle individual packages anyway (ESM-only ones, say)
	externalsPresets: { node: true, nodeModules: true },
	module: {
		rules: [
			{
				test: /\.(png|jpe?g|svg|woff2?)$/,
				type: "asset/resource",
				// the client build already wrote these files; only the URL is needed here
				generator: { emit: false }
			}
		]
	},
	optimization: {
		chunkIds: "named"
	}
};

module.exports = [client, server];
```

# dist/client/ssr-manifest.json

Keyed by source module. `./page.js` lists its own chunk, its CSS, and any chunk it depends on.

```json
{
  "./example.js": [
    "/dist/client/main.css",
    "/dist/client/main.js"
  ],
  "./page.css": [
    "/dist/client/page_js.css",
    "/dist/client/page_js.js"
  ],
  "./page.js": [
    "/dist/client/page_js.css",
    "/dist/client/page_js.js"
  ],
  "./style.css": [
    "/dist/client/main.css",
    "/dist/client/main.js"
  ]
}
```

# dist/client/manifest.json

Keyed by emitted asset, with the entrypoint graph alongside it.

```json
{
  "entrypoints": {
    "main": {
      "imports": [
        "main.js",
        "main.css"
      ]
    }
  },
  "assets": {
    "main.js": {
      "file": "/dist/client/main.js"
    },
    "main.css": {
      "file": "/dist/client/main.css"
    },
    "page_js.js": {
      "file": "/dist/client/page_js.js"
    },
    "page_js.css": {
      "file": "/dist/client/page_js.css"
    }
  }
}
```

# Info

## Unoptimized

```
client:
  assets by path *.js 16.3 KiB
    asset main.js 15.5 KiB [emitted] (name: main)
    asset page_js.js 820 bytes [emitted]
  assets by path *.json 721 bytes
    asset manifest.json 389 bytes [emitted]
    asset ssr-manifest.json 332 bytes [emitted]
  assets by path *.css 243 bytes
    asset main.css 122 bytes [emitted] (name: main)
    asset page_js.css 121 bytes [emitted]
  Entrypoint main 15.6 KiB = main.js 15.5 KiB main.css 122 bytes
  chunk (runtime: main) main.js, main.css (main) 343 bytes (javascript) 35 bytes (css) 9.43 KiB (runtime) [entry] [rendered]
    > ./example.js main
    runtime modules 9.43 KiB 10 modules
    dependent modules 35 bytes [dependent] 1 module
    ./example.js 343 bytes [built] [code generated]
      [no exports]
      [used exports unknown]
      entry ./example.js main
  chunk (runtime: main) page_js.js, page_js.css 121 bytes (javascript) 37 bytes (css) [rendered]
    > ./page.js ./example.js 9:0-19
    dependent modules 37 bytes [dependent] 1 module
    ./page.js 121 bytes [built] [code generated]
      [exports: render]
      [used exports unknown]
      import() ./page.js ./example.js 9:0-19
  client (webpack X.X.X) compiled successfully

server:
  asset main.mjs 15.9 KiB [emitted] [javascript module] (name: main)
  asset page_js.mjs 867 bytes [emitted] [javascript module]
  asset page_js.css 121 bytes [emitted]
  chunk (runtime: main) main.mjs (main) 1.28 KiB (javascript) 8.39 KiB (runtime) [entry] [rendered]
    > ./server.js main
    runtime modules 8.39 KiB 11 modules
    dependent modules 42 bytes [dependent] 1 module
    ./server.js 1.24 KiB [built] [code generated]
      [exports: renderDocument]
      [used exports unknown]
      entry ./server.js main
      used as library export
  chunk (runtime: main) page_js.mjs, page_js.css 121 bytes (javascript) 37 bytes (css) [rendered]
    > ./page.js ./server.js 13:26-45
    dependent modules 37 bytes [dependent] 1 module
    ./page.js 121 bytes [built] [code generated]
      [exports: render]
      [used exports unknown]
      import() ./page.js ./server.js 13:26-45
  server (webpack X.X.X) compiled successfully
```

## Production mode

```
client:
  assets by path *.js 3.44 KiB
    asset main.js 3.25 KiB [emitted] [minimized] (name: main)
    asset page_js-page_css.js 200 bytes [emitted] [minimized]
  assets by path *.json 793 bytes
    asset manifest.json 425 bytes [emitted]
    asset ssr-manifest.json 368 bytes [emitted]
  assets by path *.css 58 bytes
    asset page_js-page_css.css 30 bytes [emitted] [minimized]
    asset main.css 28 bytes [emitted] [minimized] (name: main)
  Entrypoint main 3.27 KiB = main.js 3.25 KiB main.css 28 bytes
  chunk (runtime: main) main.js, main.css (main) 385 bytes (javascript) 35 bytes (css) 9.19 KiB (runtime) [entry] [rendered]
    > ./example.js main
    runtime modules 9.19 KiB 9 modules
    cacheable modules 385 bytes (javascript) 35 bytes (css)
      ./example.js + 1 modules 385 bytes [built] [code generated]
        [no exports]
        [no exports used]
        entry ./example.js main
      css ./style.css 35 bytes [built] [code generated]
        [no exports]
        [no exports used]
  chunk (runtime: main) page_js-page_css.js, page_js-page_css.css 163 bytes (javascript) 37 bytes (css) [rendered]
    > ./page.js ./example.js 9:0-19
    ./page.js + 1 modules 163 bytes [built] [code generated]
      [exports: render]
      [all exports used]
      import() ./page.js ./example.js + 1 modules ./example.js 9:0-19
    css ./page.css 37 bytes [built] [code generated]
      [no exports]
      [no exports used]
  client (webpack X.X.X) compiled successfully

server:
  asset main.mjs 3.42 KiB [emitted] [javascript module] [minimized] (name: main)
  asset page_js-page_css.mjs 258 bytes [emitted] [javascript module] [minimized]
  asset page_js-page_css.css 30 bytes [emitted] [minimized]
  chunk (runtime: main) main.mjs (main) 1.28 KiB (javascript) 8.17 KiB (runtime) [entry] [rendered]
    > ./server.js main
    runtime modules 8.17 KiB 10 modules
    ./server.js + 1 modules 1.28 KiB [not cacheable] [built] [code generated]
      [exports: renderDocument]
      [all exports used]
      entry ./server.js main
      used as library export
  chunk (runtime: main) page_js-page_css.mjs, page_js-page_css.css 163 bytes (javascript) 37 bytes (css) [rendered]
    > ./page.js ./server.js 13:26-45
    ./page.js + 1 modules 163 bytes [built] [code generated]
      [exports: render]
      [all exports used]
      import() ./page.js ./server.js + 1 modules ./server.js 13:26-45
    css ./page.css 37 bytes [built] [code generated]
      [no exports]
      [no exports used]
  server (webpack X.X.X) compiled successfully
```
