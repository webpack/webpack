import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

// Document-order list of every script-src chunk url emitted into the page.
// Classic <script src> tags get `type="module"` auto-inserted by the parser
// (because `output.module` is on), so they look identical to native module
// scripts in HTML; we discriminate by chunk content instead of by tag shape.
const scriptChunkUrls = [
	...page.matchAll(/<script[^>]*\bsrc="(__html_[^"]+)">/g)
].map((m) => m[1]);

it("should bundle classic and module <script src> as separate entry chunks and rewrite their src attributes", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// Originals replaced
	expect(page).not.toContain('src="./entry.js"');
	expect(page).not.toContain('src="./other.js"');
	expect(page).not.toContain('src="./classic-typed.js"');
	expect(page).not.toContain('src="./module-entry.js"');
	expect(page).not.toContain('src="data:text/javascript');
	expect(page).not.toContain('src="data:application/javascript');
	// Non-executable script types (ld+json, importmap, …) are NOT bundled
	// as JS entries — they flow through HtmlSourceDependency, so the
	// `type` attribute stays as the browser expects but the src gets
	// rewritten like any other asset URL.
	expect(page).toMatch(/<script type="application\/ld\+json" src="[^"]+">/);
	expect(page).toMatch(/<script type="importmap" src="[^"]+">/);
	// The original source paths are NOT in the output — they were rewritten
	// to asset URLs by HtmlSourceDependency.
	expect(page).not.toContain('src="./jsonld-data.jsonld"');
	expect(page).not.toContain('src="./importmap.json"');
	// Classic <script src> tags get `type="module"` auto-inserted because
	// `output.module` is on in this fixture; the existing `type="text/javascript"`
	// is upgraded in place to `type="module"` for the same reason.
	expect(page).not.toContain('type="text/javascript"');
	expect(page).not.toContain('<script src="__html_');
});

it("should bundle <script src=data:...> inline JS into chunks", () => {
	// The two data URI script tags are the last two executable-JS scripts
	// in document order (the non-JS scripts that follow stay as asset URLs).
	const dataUriChunks = scriptChunkUrls.slice(-2).map(readChunk);
	for (const chunk of dataUriChunks) {
		expect(chunk).toContain("console.log(1)");
	}
});

it("should bundle classic <script src> through CommonJS resolution", () => {
	// First script in document order is `./entry.js` (classic, `module.exports = …`).
	const classicChunk = readChunk(scriptChunkUrls[0]);
	expect(classicChunk).toMatchSnapshot();
	expect(classicChunk).toContain('module.exports = "first entry";');
	expect(classicChunk).toContain(
		"var __webpack_exports__ = __webpack_require__"
	);
	expect(classicChunk).not.toContain(
		"__webpack_require__.r(__webpack_exports__)"
	);
});

it("should bundle <script type=module src> through ESM resolution alongside classic scripts", () => {
	// Find the chunk whose source is module-entry.js (ESM-resolved).
	const moduleChunk = scriptChunkUrls
		.map(readChunk)
		.find((c) => c.includes('"module entry"'));
	expect(moduleChunk).toBeDefined();
	expect(moduleChunk).toMatchSnapshot();
	// ESM-parsed: harmony hints, no CommonJS-style module.exports.
	expect(moduleChunk).toContain("unused harmony");
	expect(moduleChunk).not.toContain("module.exports =");
	// Chunk format follows `output.module` — no IIFE bootstrap.
	expect(moduleChunk).not.toContain("// webpackBootstrap");
	expect(moduleChunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
});

it("should chain classic <script src> entries via dependOn so they share a runtime", () => {
	expect(scriptChunkUrls.length).toBeGreaterThanOrEqual(3);
	const first = readChunk(scriptChunkUrls[0]);
	expect(first).toContain("function __webpack_require__(moduleId)");
	// Other classic chunks reuse the first chunk's runtime via dependOn.
	// (module-entry.js is in a separate `esm-script` group and has its own
	// runtime, so just check the ones that came from CommonJS source.)
	for (const url of scriptChunkUrls.slice(1)) {
		const chunk = readChunk(url);
		if (chunk.includes("module.exports =") || chunk.includes("console.log(1)")) {
			expect(chunk).not.toContain("function __webpack_require__(moduleId)");
		}
	}
});
