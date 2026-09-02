import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The Node half of the app: it renders the route to HTML and consumes the client
// build's artifacts. Resolved from this module, so the working directory is free;
// read once at startup — re-read per request to pick up a client rebuild.
const manifest = JSON.parse(
	readFileSync(
		resolve(
			dirname(fileURLToPath(import.meta.url)),
			"../client/ssr-manifest.json"
		),
		"utf8"
	)
);

export async function renderDocument() {
	// The route is code-split, so only its modules load here — and only their
	// CSS ends up in the collected styles below.
	const { render } = await import("./page.js");
	const body = render();

	// CSS collected while rendering without a DOM. `SSR` is `true` only in a
	// node build, so this branch is dropped from the browser bundle entirely.
	const criticalCss = import.meta.env.SSR ? __webpack_css_server_styles__ : "";

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
