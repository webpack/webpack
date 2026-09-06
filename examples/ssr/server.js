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
