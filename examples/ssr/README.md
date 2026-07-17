# Server-Side Rendering (SSR)

This example shows the building blocks webpack provides for server-side rendering, aligned with the SSR features of Vite and Rspack/Rsbuild:

- **`SSRManifestPlugin`** emits `ssr-manifest.json`, mapping each source module to the client assets (JS chunks and CSS) it needs. The server uses it to inject `<link rel="modulepreload">` / stylesheet tags for exactly what it rendered.
- **`__webpack_css_server_styles__`** returns the CSS collected during a server render, so the critical CSS can be inlined into the HTML (no flash of unstyled content).
- **`externalsPresets.nodeModules`** externalizes installed packages from the Node server build, so dependencies are `require`d at runtime instead of bundled.

## Client build

The client build emits the browser assets and the SSR manifest. `page.js` is code-split, so it (and its CSS) become a separate chunk described by the manifest.

# example.js

```javascript
import "./style.css";

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

# webpack.config.js

```javascript
"use strict";

const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	optimization: {
		chunkIds: "named" // keep filenames stable across modes (for this example)
	},
	experiments: {
		css: true
	},
	plugins: [new webpack.SSRManifestPlugin()]
};

module.exports = config;
```

# dist/ssr-manifest.json

The manifest maps each source module to the client files needed to load it.

```json
{
  "./example.js": [
    "dist/output.css",
    "dist/output.js"
  ],
  "./page.css": [
    "dist/page_js.output.css",
    "dist/page_js.output.js"
  ],
  "./page.js": [
    "dist/page_js.output.css",
    "dist/page_js.output.js"
  ],
  "./style.css": [
    "dist/output.css",
    "dist/output.js"
  ]
}
```

## Server usage

The server renders the same components and combines the manifest (for preloads) with the collected critical CSS.

# server.js

```javascript
"use strict";

// The *server* half of the app. It renders the same components to HTML and
// consumes the artifacts of the client build:
//
//   - `ssr-manifest.json` (from `SSRManifestPlugin`) to know which client
//     assets to preload for the modules it rendered, and
//   - `__webpack_css_server_styles__` to inline the CSS collected during the
//     render as critical CSS.
//
// Build it for Node with the installed packages externalized:
//
//   {
//     target: "node",
//     externalsPresets: { node: true, nodeModules: true },
//     experiments: { css: true }
//   }

import { render } from "./page.js";
import manifest from "./dist/ssr-manifest.json";

export function renderDocument() {
	const body = render();

	// CSS collected while rendering on the server (a webpack module variable).
	const criticalCss = __webpack_css_server_styles__;

	// Preload the client assets the rendered page needs, from the manifest.
	const preloads = (manifest["./page.js"] || [])
		.filter((file) => file.endsWith(".js"))
		.map((file) => `<link rel="modulepreload" href="/${file}">`)
		.join("");

	return `<!doctype html>
<html>
	<head>
		${preloads}
		<style>${criticalCss}</style>
	</head>
	<body>${body}</body>
</html>`;
}
```

# Info

## Unoptimized

```
assets by path *.js 16.2 KiB
  asset output.js 15.4 KiB [emitted] (name: main)
  asset page_js.output.js 820 bytes [emitted]
assets by path *.css 243 bytes
  asset output.css 122 bytes [emitted] (name: main)
  asset page_js.output.css 121 bytes [emitted]
asset ssr-manifest.json 304 bytes [emitted]
Entrypoint main 15.5 KiB = output.js 15.4 KiB output.css 122 bytes
chunk (runtime: main) output.js, output.css (main) 253 bytes (javascript) 35 bytes (css) 9.43 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 9.43 KiB 10 modules
  dependent modules 35 bytes [dependent] 1 module
  ./example.js 253 bytes [built] [code generated]
    [no exports]
    [used exports unknown]
    entry ./example.js main
chunk (runtime: main) page_js.output.js, page_js.output.css 121 bytes (javascript) 37 bytes (css) [rendered]
  > ./page.js ./example.js 5:0-19
  dependent modules 37 bytes [dependent] 1 module
  ./page.js 121 bytes [built] [code generated]
    [exports: render]
    [used exports unknown]
    import() ./page.js ./example.js 5:0-19
webpack X.X.X compiled successfully
```

## Production mode

```
assets by path *.js 3.45 KiB
  asset output.js 3.25 KiB [emitted] [minimized] (name: main)
  asset page_js-page_css.output.js 200 bytes [emitted] [minimized]
assets by path *.css 74 bytes
  asset page_js-page_css.output.css 38 bytes [emitted]
  asset output.css 36 bytes [emitted] (name: main)
asset ssr-manifest.json 340 bytes [emitted]
Entrypoint main 3.29 KiB = output.js 3.25 KiB output.css 36 bytes
chunk (runtime: main) output.js, output.css (main) 295 bytes (javascript) 35 bytes (css) 9.2 KiB (runtime) [entry] [rendered]
  > ./example.js main
  runtime modules 9.2 KiB 9 modules
  cacheable modules 295 bytes (javascript) 35 bytes (css)
    ./example.js + 1 modules 295 bytes [built] [code generated]
      [no exports]
      [no exports used]
      entry ./example.js main
    css ./style.css 35 bytes [built] [code generated]
      [no exports]
      [no exports used]
chunk (runtime: main) page_js-page_css.output.js, page_js-page_css.output.css 163 bytes (javascript) 37 bytes (css) [rendered]
  > ./page.js ./example.js 5:0-19
  ./page.js + 1 modules 163 bytes [built] [code generated]
    [exports: render]
    [all exports used]
    import() ./page.js ./example.js + 1 modules ./example.js 5:0-19
  css ./page.css 37 bytes [built] [code generated]
    [no exports]
    [no exports used]
webpack X.X.X compiled successfully
```
