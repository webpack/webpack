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
