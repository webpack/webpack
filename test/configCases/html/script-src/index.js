import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

const chunkFor = (regex) => {
	const m = page.match(regex);
	if (!m) throw new Error(`No chunk match for ${regex}`);
	return m[1];
};

it("should bundle classic and module <script src> as separate entry chunks and rewrite their src attributes", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// Classic <script src> rewritten
	expect(page).not.toContain('src="./entry.js"');
	expect(page).not.toContain('src="./other.js"');
	expect(page).not.toContain('src="./classic-typed.js"');
	// <script type="module" src> rewritten too
	expect(page).not.toContain('src="./module-entry.js"');
	// Data URIs are also bundled (webpack's DataUriPlugin resolves them so
	// the inline JS becomes a real module and the src is rewritten).
	expect(page).not.toContain('src="data:text/javascript');
	expect(page).not.toContain("src=\"data:application/javascript");
});

it("should bundle <script src=data:...> inline JS into a chunk", () => {
	// Find the chunk that came from the inline `console.log(1)` data URI.
	const classicScriptUrls = [
		...page.matchAll(
			/<script(?: type="text\/javascript")? src="(__html_[^"]+)">/g
		)
	].map((m) => m[1]);
	// The two data URI scripts come after the classic + module ones.
	const dataUriChunks = classicScriptUrls.slice(-2).map(readChunk);
	for (const chunk of dataUriChunks) {
		// Inline data-URI script body ends up in the chunk source.
		expect(chunk).toContain("console.log(1)");
	}
});

it("should bundle classic <script src> through CommonJS resolution", () => {
	// The first <script src> in document order becomes the first classic entry.
	const classicChunkName = chunkFor(/<script src="(__html_[^"]+)">/);
	const classicChunk = readChunk(classicChunkName);
	expect(classicChunk).toMatchSnapshot();
	// Classic source: CommonJS-style exports flow through unchanged.
	expect(classicChunk).toContain('module.exports = "first entry";');
	expect(classicChunk).toContain(
		"var __webpack_exports__ = __webpack_require__"
	);
	// Not parsed as ESM, so no harmony export helpers.
	expect(classicChunk).not.toContain(
		"__webpack_require__.r(__webpack_exports__)"
	);
});

it("should bundle <script type=module src> through ESM resolution alongside classic scripts", () => {
	const moduleChunkName = chunkFor(
		/<script type="module" src="(__html_[^"]+)">/
	);
	const moduleChunk = readChunk(moduleChunkName);
	expect(moduleChunk).toMatchSnapshot();
	// ESM source was parsed as ESM (no CommonJS-style module.exports), and
	// because the entry's exports are never imported they are flagged as
	// unused — harmony comments confirm the file went through the ESM parser.
	expect(moduleChunk).toContain('"module entry"');
	expect(moduleChunk).toContain("unused harmony");
	expect(moduleChunk).not.toContain('module.exports =');
	// Chunk format follows the user's `output.module` / `experiments.outputModule`
	// — this fixture turns it on, so no IIFE bootstrap.
	expect(moduleChunk).not.toContain("// webpackBootstrap");
	expect(moduleChunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
});

it("should chain classic <script src> entries via dependOn so they share a runtime", () => {
	// All classic <script src> chunks: the first carries the webpack runtime,
	// the rest reuse it via the chained `dependOn` set up in HtmlModulesPlugin.
	const classicScriptUrls = [
		...page.matchAll(/<script(?: type="text\/javascript")? src="(__html_[^"]+)">/g)
	].map((m) => m[1]);
	expect(classicScriptUrls.length).toBeGreaterThanOrEqual(3);
	const first = readChunk(classicScriptUrls[0]);
	expect(first).toContain("function __webpack_require__(moduleId)");
	for (let i = 1; i < classicScriptUrls.length; i++) {
		const chunk = readChunk(classicScriptUrls[i]);
		// Subsequent chunks rely on the first chunk's runtime via dependOn.
		expect(chunk).not.toContain("function __webpack_require__(moduleId)");
	}
});
