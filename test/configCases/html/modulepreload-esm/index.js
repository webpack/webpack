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

it("should rewrite <link rel=modulepreload> and <script type=module src> to chunk URLs", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	expect(page).not.toContain('href="./preload.js"');
	expect(page).not.toContain('href="./preload-other.js"');
	expect(page).not.toContain('src="./entry.js"');
	// All entries get rewritten to the generated chunk filenames.
	expect(page).toMatch(/<link rel="modulepreload" href="__html_[^"]+\.mjs">/);
	expect(page).toMatch(/<script type="module" src="__html_[^"]+\.mjs">/);
	// Data URI in modulepreload is also bundled (webpack resolves the inline
	// module via DataUriPlugin) and the href is rewritten.
	expect(page).not.toContain('href="data:text/javascript');
});

it("should emit module-format chunks (no IIFE wrapper) when output.module is enabled", () => {
	// First modulepreload chunk (in document order) holds the runtime.
	const preloadChunkName = chunkFor(
		/<link rel="modulepreload" href="(__html_[^"]+\.mjs)">/
	);
	const preloadChunk = readChunk(preloadChunkName);
	expect(preloadChunk).toMatchSnapshot();
	// No IIFE wrapper because the user enabled `output.module` /
	// `experiments.outputModule`.
	expect(preloadChunk).not.toContain("// webpackBootstrap");
	expect(preloadChunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(preloadChunk).toContain("var __webpack_modules__");
	expect(preloadChunk).toContain('"preload module"');

	// `<script type="module" src>` is also ESM-resolved.
	const entryChunkName = chunkFor(
		/<script type="module" src="(__html_[^"]+\.mjs)">/
	);
	const entryChunk = readChunk(entryChunkName);
	expect(entryChunk).toMatchSnapshot();
	expect(entryChunk).not.toContain("// webpackBootstrap");
});

it("should not force preload-only entries to execute via dependOn", () => {
	// Each entry depends only on the group leader, so a later
	// <script type="module" src> chunk imports the leader (to share the
	// runtime) but never the intermediate modulepreload chunks. That keeps
	// the "preload without execute" contract of <link rel="modulepreload">.
	const preloadChunkUrls = [
		...page.matchAll(/<link rel="modulepreload" href="(__html_[^"]+\.mjs)">/g)
	].map((m) => m[1]);
	const moduleScriptUrl = chunkFor(
		/<script type="module" src="(__html_[^"]+\.mjs)">/
	);
	expect(preloadChunkUrls.length).toBeGreaterThanOrEqual(2);
	const leader = preloadChunkUrls[0];
	const moduleScriptChunk = readChunk(moduleScriptUrl);
	// The late entry references the leader so it can reuse the runtime…
	expect(moduleScriptChunk).toContain(leader);
	// …but does not import the intermediate modulepreload chunks.
	for (let i = 1; i < preloadChunkUrls.length; i++) {
		expect(moduleScriptChunk).not.toContain(preloadChunkUrls[i]);
	}
});
