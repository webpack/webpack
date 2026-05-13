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
	expect(page).toMatch(/<link rel="modulepreload" href="__html_[^"]+\.mjs">/);
	expect(page).toMatch(/<script type="module" src="__html_[^"]+\.mjs">/);
	// Data URI in modulepreload is also bundled.
	expect(page).not.toContain('href="data:text/javascript');
});

it("should emit module-format chunks (no IIFE wrapper) when output.module is enabled", () => {
	const preloadChunkName = chunkFor(
		/<link rel="modulepreload" href="(__html_[^"]+\.mjs)">/
	);
	const preloadChunk = readChunk(preloadChunkName);
	expect(preloadChunk).toMatchSnapshot();
	// No IIFE wrapper because output.module / experiments.outputModule is on.
	expect(preloadChunk).not.toContain("// webpackBootstrap");
	expect(preloadChunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(preloadChunk).toContain('"preload module"');

	const entryChunkName = chunkFor(
		/<script type="module" src="(__html_[^"]+\.mjs)">/
	);
	const entryChunk = readChunk(entryChunkName);
	expect(entryChunk).toMatchSnapshot();
	expect(entryChunk).not.toContain("// webpackBootstrap");
});

it("should keep <link rel=modulepreload> entries independent of the module script chunk", () => {
	// Modulepreload entries are emitted as independent chunks with no
	// `dependOn`, so a later `<script type="module" src>` chunk never
	// imports them — that's what preserves the "preload but don't execute"
	// contract of modulepreload. (If a module script wants the preloaded
	// module to actually run, it must import it via JS, in which case
	// webpack inlines the module into the script chunk on its own.)
	const preloadChunkUrls = [
		...page.matchAll(/<link rel="modulepreload" href="(__html_[^"]+\.mjs)">/g)
	].map((m) => m[1]);
	const moduleScriptUrl = chunkFor(
		/<script type="module" src="(__html_[^"]+\.mjs)">/
	);
	expect(preloadChunkUrls.length).toBeGreaterThanOrEqual(2);
	const moduleScriptChunk = readChunk(moduleScriptUrl);
	for (const preloadChunkUrl of preloadChunkUrls) {
		expect(moduleScriptChunk).not.toContain(preloadChunkUrl);
	}
});
