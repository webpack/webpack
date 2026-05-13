const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const readChunk = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should rewrite script src attributes without changing the type attribute when output.module is off", () => {
	expect(typeof page).toBe("string");
	expect(page).toMatchSnapshot();
	// Original source paths were rewritten.
	expect(page).not.toContain('src="./entry.js"');
	expect(page).not.toContain('src="./other.js"');
	expect(page).not.toContain('src="./classic-typed.js"');
	expect(page).not.toContain('src="./module-entry.js"');
	// Classic <script src> (no type) stays without a type attribute — the
	// auto type=module upgrade only runs when output.module is enabled.
	expect(page).toMatch(/<script src="__html_[^"]+\.chunk\.js">/);
	// type="text/javascript" stays as-is too.
	expect(page).toMatch(
		/<script type="text\/javascript" src="__html_[^"]+\.chunk\.js">/
	);
	// type="module" stays as-is.
	expect(page).toMatch(/<script type="module" src="__html_[^"]+\.chunk\.js">/);
	// Non-executable types still flow through HtmlSourceDependency.
	expect(page).toMatch(/<script type="application\/ld\+json" src="[^"]+\.jsonld">/);
});

it("should emit classic IIFE-wrapped chunks for <script src>", () => {
	// The first classic <script src> chunk lives at __html_*_0.chunk.js.
	const classicChunkName = page.match(
		/<script src="(__html_[^"]+\.chunk\.js)">/
	)[1];
	const classicChunk = readChunk(classicChunkName);
	expect(classicChunk).toMatchSnapshot();
	// Classic format: IIFE bootstrap wraps the runtime + entry module.
	expect(classicChunk).toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(classicChunk).toContain("// webpackBootstrap");
	// CommonJS source flows through.
	expect(classicChunk).toContain('module.exports = "first entry";');
});

it("should emit IIFE-wrapped chunks for <script type=module src> too (still valid as ES modules)", () => {
	const moduleChunkName = page.match(
		/<script type="module" src="(__html_[^"]+\.chunk\.js)">/
	)[1];
	const moduleChunk = readChunk(moduleChunkName);
	expect(moduleChunk).toMatchSnapshot();
	// Chunk format follows output.module (off here) → IIFE.
	expect(moduleChunk).toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(moduleChunk).toContain("// webpackBootstrap");
	// ESM source still goes through harmony helpers because of the dep
	// category — only the chunk's outer wrapper changes with output.module.
	expect(moduleChunk).toContain('"module entry"');
});
