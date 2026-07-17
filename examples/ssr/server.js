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
