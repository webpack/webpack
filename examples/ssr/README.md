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
import React, { lazy } from "react";
import { hydrateRoot } from "react-dom/client";
import { App } from "./App.js";
import "./style.css";

if (import.meta.env.DEV) {
	console.log("client bundle, mode:", import.meta.env.MODE);
}

// The route is code-split, so its stylesheet would be discovered a round trip
// late; the one the server printed from the manifest is adopted, not fetched again.
const Page = lazy(() => import("./page.js"));

hydrateRoot(document.getElementById("root"), <App Page={Page} />);
```

# App.js

```javascript
import React, { Suspense } from "react";

// The shell both builds render: the server with the route module already
// imported, the browser with a lazy one it still has to fetch.
export function App({ Page }) {
	return (
		<div className="app">
			<h1 className="title">webpack server-side rendering</h1>
			<Suspense fallback={<p className="pending">Loading the route…</p>}>
				<Page />
			</Suspense>
		</div>
	);
}
```

# page.js

```javascript
import React from "react";
import "./page.css";

export default function Page() {
	return (
		<article className="route">
			<h2 className="route-title">A code-split route</h2>
			<p className="route-body">
				This markup was rendered on the server. Its stylesheet lives in the
				route&apos;s own chunk, so the browser only learns about it once that
				chunk arrives — unless the server says so first.
			</p>
		</article>
	);
}
```

# server.js

```javascript
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { App } from "./App.js";

// `import.meta.url` in module code is the *source* module's url, so it cannot
// locate the emitted bundle; the runtime public path can, from any directory.
const clientDirectory = fileURLToPath(
	new URL("../client/", __webpack_public_path__)
);

const CONTENT_TYPES = {
	".css": "text/css; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".map": "application/json; charset=utf-8"
};

/** @type {Record<string, string[]> | undefined} */
let cachedManifest;

// Re-read while developing so a client rebuild is picked up without a restart;
// in production the file cannot change under a running server.
function readManifest() {
	if (import.meta.env.PROD && cachedManifest) return cachedManifest;
	cachedManifest = JSON.parse(
		readFileSync(join(clientDirectory, "ssr-manifest.json"), "utf8")
	);
	return cachedManifest;
}

const isStylesheet = (file) => file.endsWith(".css");
const isScript = (file) => file.endsWith(".js");
const stylesheetTag = (file) => `<link rel="stylesheet" href="${file}">`;

export async function renderDocument({ inlineCss = false } = {}) {
	// The server splits the route too, so loading it is what collects its CSS.
	const { default: Page } = await import("./page.js");
	const body = renderToString(<App Page={Page} />);
	const manifest = readManifest();
	const entryFiles = manifest["./example.js"] || [];
	const routeFiles = manifest["./page.js"] || [];

	// The entry's stylesheet is in the document either way; only the route's is in
	// question, because it travels with a chunk the browser has not asked for yet.
	const head = entryFiles.filter(isStylesheet).map(stylesheetTag);

	if (inlineCss) {
		// What chunk loading pulled in during this process, not during this request:
		// the registry is global and cumulative, so inline it only where
		// over-inlining is acceptable. It holds no initial stylesheet, which is why
		// the entry's is still linked above.
		head.push(`<style>${__webpack_css_server_styles__}</style>`);
	} else {
		head.push(...routeFiles.filter(isStylesheet).map(stylesheetTag));
		// preloaded rather than loaded: the entry imports the chunk when it hydrates
		head.push(
			...routeFiles
				.filter(isScript)
				.map((file) => `<link rel="preload" as="script" href="${file}">`)
		);
	}

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>webpack SSR</title>
		${head.join("\n\t\t")}
	</head>
	<body>
		<div id="root">${body}</div>
		<script defer src="/dist/client/main.js"></script>
	</body>
</html>
`;
}

function serveClientFile(pathname, response) {
	const file = join(clientDirectory, pathname.slice("/dist/client/".length));
	if (!file.startsWith(clientDirectory) || !existsSync(file)) {
		response.writeHead(404).end("not found");
		return;
	}
	response.writeHead(200, {
		"content-type": CONTENT_TYPES[extname(file)] || "application/octet-stream",
		"content-length": statSync(file).size
	});
	createReadStream(file).pipe(response);
}

const server = createServer(async (request, response) => {
	const { pathname } = new URL(request.url, "http://localhost");
	if (pathname.startsWith("/dist/client/")) {
		serveClientFile(pathname, response);
		return;
	}
	const html = await renderDocument({ inlineCss: pathname === "/inline" });
	response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
	response.end(html);
});

server.listen(3000, () => {
	console.log("http://localhost:3000 — manifest <link> tags");
	console.log("http://localhost:3000/inline — inlined collected CSS");
});
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");
const webpack = require("../../");

const jsx = {
	test: /\.js$/,
	include: [path.resolve(__dirname, ".")],
	use: {
		loader: "babel-loader",
		options: { presets: ["@babel/react"] }
	}
};

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
	module: { rules: [jsx] },
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
	// a node target has no DOM, so `import.meta.env.SSR` is `true` here and the
	// CSS runtime collects the styles rather than linking them into a page
	target: "node",
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
			jsx,
			{
				test: /\.(png|jpe?g|svg|woff2?)$/,
				type: "asset/resource",
				// the client build already wrote these files; only the URL is needed here
				generator: { emit: false }
			}
		],
		generator: {
			css: {
				// a document-less target emits no stylesheets by default; opt in,
				// because the collected CSS below is read back from them
				exportsOnly: false
			}
		}
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		outputModule: true
	}
};

module.exports = [client, server];
```

# dist/client/ssr-manifest.json

Keyed by source module. `./page.js` lists its own chunk, its CSS, and any chunk it depends on.

```json
{
  "../../node_modules/react-dom/cjs/react-dom-client.development.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react-dom/cjs/react-dom-client.production.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react-dom/cjs/react-dom.development.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react-dom/cjs/react-dom.production.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react-dom/client.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react-dom/index.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/cjs/react-jsx-dev-runtime.development.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/cjs/react-jsx-dev-runtime.production.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/cjs/react.development.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/cjs/react.production.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/index.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/react/jsx-dev-runtime.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/scheduler/cjs/scheduler.development.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/scheduler/cjs/scheduler.production.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "../../node_modules/scheduler/index.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "./App.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "./example.js": [
    "/dist/client/main.js",
    "/dist/client/main.css"
  ],
  "./page.css": [
    "/dist/client/page_js.js",
    "/dist/client/page_js.css"
  ],
  "./page.js": [
    "/dist/client/page_js.js",
    "/dist/client/page_js.css"
  ],
  "./style.css": [
    "/dist/client/main.js",
    "/dist/client/main.css"
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
  assets by path *.js 1.7 MiB
    asset main.js 1.69 MiB [emitted] (name: main)
    asset page_js.js 1.79 KiB [emitted]
  assets by path *.json 2.54 KiB
    asset ssr-manifest.json 2.16 KiB [emitted]
    asset manifest.json 389 bytes [emitted]
  assets by path *.css 615 bytes
    asset page_js.css 352 bytes [emitted]
    asset main.css 263 bytes [emitted] (name: main)
  Entrypoint main 1.69 MiB = main.js 1.69 MiB main.css 263 bytes
  chunk (runtime: main) main.js, main.css (main) 1.65 MiB (javascript) 176 bytes (css) 9.23 KiB (runtime) [entry] [rendered]
    > ./example.js main
    dependent modules 1.65 MiB (javascript) 176 bytes (css) [dependent] 17 modules
    runtime modules 9.23 KiB 12 modules
    ./example.js 617 bytes [built] [code generated]
      [no exports]
      [used exports unknown]
      entry ./example.js main
  chunk (runtime: main) page_js.js, page_js.css 648 bytes (javascript) 268 bytes (css) [rendered]
    > ./page.js ./example.js 12:37-56
    dependent modules 268 bytes [dependent] 1 module
    ./page.js 648 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./page.js ./example.js 12:37-56
  client (webpack X.X.X) compiled successfully

server:
  asset main.mjs 21.2 KiB [emitted] [javascript module] (name: main)
  asset page_js.mjs 1.63 KiB [emitted] [javascript module]
  asset page_js.css 352 bytes [emitted]
  chunk (runtime: main) main.mjs (main) 4.96 KiB (javascript) 5.86 KiB (runtime) [entry] [rendered]
    > ./server.js main
    runtime modules 5.86 KiB 9 modules
    dependent modules 1.02 KiB [dependent] 8 modules
    ./server.js 3.93 KiB [built] [code generated]
      [exports: renderDocument]
      [used exports unknown]
      entry ./server.js main
      used as library export
  chunk (runtime: main) page_js.mjs, page_js.css 648 bytes (javascript) 268 bytes (css) [rendered]
    > ./page.js ./server.js 39:12-31
    dependent modules 268 bytes [dependent] 1 module
    ./page.js 648 bytes [built] [code generated]
      [exports: default]
      [used exports unknown]
      import() ./page.js ./server.js 39:12-31
  server (webpack X.X.X) compiled successfully
```

## Production mode

```
client:
  assets by path *.js 189 KiB
    asset main.js 188 KiB [emitted] [minimized] (name: main) 1 related asset
    asset page_js-page_css.js 565 bytes [emitted] [minimized]
  assets by path *.json 2.07 KiB
    asset ssr-manifest.json 1.57 KiB [emitted]
    asset manifest.json 510 bytes [emitted]
  assets by path *.css 337 bytes
    asset page_js-page_css.css 197 bytes [emitted] [minimized]
    asset main.css 140 bytes [emitted] [minimized] (name: main)
  Entrypoint main 189 KiB = main.js 188 KiB main.css 140 bytes
  chunk (runtime: main) main.js, main.css (main) 562 KiB (javascript) 176 bytes (css) 9.23 KiB (runtime) [entry] [rendered]
    > ./example.js main
    runtime modules 9.23 KiB 11 modules
    dependent modules 17.6 KiB [dependent] 4 modules
    cacheable modules 544 KiB (javascript) 176 bytes (css)
      ./example.js + 8 modules 544 KiB [built] [code generated]
        [no exports]
        [no exports used]
        entry ./example.js main
      css ./style.css 176 bytes [built] [code generated]
        [no exports]
        [no exports used]
  chunk (runtime: main) page_js-page_css.js, page_js-page_css.css 690 bytes (javascript) 268 bytes (css) [rendered]
    > ./page.js ./example.js 12:37-56
    ./page.js + 1 modules 690 bytes [built] [code generated]
      [exports: default]
      import() ./page.js ./example.js + 8 modules ./example.js 12:37-56
    css ./page.css 268 bytes [built] [code generated]
      [no exports]
      [no exports used]
  client (webpack X.X.X) compiled successfully

server:
  asset main.mjs 4.44 KiB [emitted] [javascript module] [minimized] (name: main)
  asset page_js-page_css.mjs 565 bytes [emitted] [javascript module] [minimized]
  asset page_js-page_css.css 197 bytes [emitted] [minimized]
  chunk (runtime: main) main.mjs (main) 4.96 KiB (javascript) 5.68 KiB (runtime) [entry] [rendered]
    > ./server.js main
    runtime modules 5.68 KiB 8 modules
    dependent modules 84 bytes [dependent] 2 modules
    ./server.js + 6 modules 4.88 KiB [not cacheable] [built] [code generated]
      [exports: renderDocument]
      [all exports used]
      entry ./server.js main
      used as library export
  chunk (runtime: main) page_js-page_css.mjs, page_js-page_css.css 690 bytes (javascript) 268 bytes (css) [rendered]
    > ./page.js ./server.js 39:12-31
    ./page.js + 1 modules 690 bytes [built] [code generated]
      [exports: default]
      [all exports used]
      import() ./page.js ./server.js + 6 modules ./server.js 39:12-31
    css ./page.css 268 bytes [built] [code generated]
      [no exports]
      [no exports used]
  server (webpack X.X.X) compiled successfully
```
