import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

// `import page from "./page.html"` always returns the body as a string, but static
// analysis cannot see through the HTML module type. Normalize once so the rest of
// the file reads a concrete string.
const pageContent = typeof page === "string" ? page : "";

// Document-order list of every inline-script chunk url emitted into the page.
const scriptChunkUrls = [
	...pageContent.matchAll(/<script[^>]*\bsrc="(page\d*\.mjs)"/g)
].map((m) => m[1]);

it("should bundle inline <script> bodies as entry chunks and rewrite their tags to `<script src>`", () => {
	expect(typeof page).toBe("string");
	expect(pageContent).toMatchSnapshot();

	// The inline JS bodies that were executable JS are gone from the HTML —
	// they live in entry chunks now, referenced by `src`.
	expect(pageContent).not.toContain("var greeting");
	expect(pageContent).not.toContain("var counter");
	expect(pageContent).not.toContain("/* second script */");
	expect(pageContent).not.toContain('console.log("<b>hello</b>")');
	expect(pageContent).not.toContain("__inlineModuleSum");

	// Five executable inline scripts in two runs: the data blocks between
	// them end the first, and the body's two are the second.
	expect(scriptChunkUrls).toHaveLength(2);

	// Non-JS `<script type>` blocks (importmap, JSON-LD) pass through
	// unchanged — their bodies stay inline.
	expect(pageContent).toContain('"@context": "https://schema.org"');
	expect(pageContent).toContain('"imports": {"foo": "./foo.js"}');
	expect(pageContent).toMatch(
		/<script type="application\/ld\+json">[\s\S]*<\/script>/
	);
	expect(pageContent).toMatch(/<script type="importmap">[\s\S]*<\/script>/);
});

it("should auto-upgrade classic inline <script> to type=module when output.module is on", () => {
	// With `output.module` on, every classic inline `<script>` gets `type="module"`
	// inserted so the emitted ES-module chunk loads correctly — and the one that
	// already had it keeps it, so every executable inline script is module-typed.
	const moduleTaggedSrcs = [
		...pageContent.matchAll(
			/<script[^>]*\btype="module"[^>]*\bsrc="(page\d*\.mjs)"/g
		),
		...pageContent.matchAll(
			/<script[^>]*\bsrc="(page\d*\.mjs)"[^>]*\btype="module"/g
		)
	].map((m) => m[1]);
	expect(new Set(moduleTaggedSrcs).size).toBe(2);
});

it("should bundle the head's inline bodies into one run's chunk", () => {
	const chunks = scriptChunkUrls.map(readChunk);
	// The head's three executable bodies are adjacent — a classic one, the
	// module-typed one, a `text/javascript` one — so one chunk carries them.
	expect(chunks[0]).toContain('console.log("<b>hello</b>")');
	expect(chunks[0]).toContain('var greeting = "hi"');
	expect(chunks[0]).toContain("__inlineModuleSum");
	expect(chunks[0]).toContain("var counter");
	expect(chunks[0]).toContain('"<div><span>nested</span></div>"');
	expect(chunks[0]).toContain("return a < b");
	expect(chunks[1]).toContain("/* second script */");
	expect(chunks[1]).toContain('document.createTextNode("done")');
});

it("should bundle inline <script type=module> as an ES-module chunk", () => {
	// It is the second body of the head's run, so its chunk is the first.
	const moduleChunk = readChunk(scriptChunkUrls[0]);
	expect(moduleChunk).toMatchSnapshot();
	// The original ESM source still appears verbatim in the bundled chunk.
	expect(moduleChunk).toContain("__inlineModuleSum");
	expect(moduleChunk).toContain("[1, 2, 3]");
	// Non-ASCII source round-trips through the base64 data URI — `π` and
	// `日本語` survive intact.
	expect(moduleChunk).toContain("日本語 π");
	// Chunk format follows `output.module` — no IIFE bootstrap and no
	// CommonJS-style `module.exports`.
	expect(moduleChunk).not.toContain("module.exports =");
	expect(moduleChunk).not.toContain("// webpackBootstrap");
	expect(moduleChunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
});

it("should emit ES-module chunks for classic inline <script> too when output.module is on (mixed case)", () => {
	// With `output.module` on, chunk format follows the option rather than the
	// original `<script>` annotation: every inline-script chunk is an ES module, with
	// no IIFE bootstrap and no CommonJS `module.exports`.
	for (const url of scriptChunkUrls) {
		const chunk = readChunk(url);
		expect(chunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
		expect(chunk).not.toContain("// webpackBootstrap");
		expect(chunk).not.toContain("module.exports =");
	}
});

it("should bundle a script typed with a legacy JavaScript MIME essence", () => {
	// `text/x-javascript` is a JavaScript MIME type, so the browser executes it —
	// treating it as a data block would leave the body unbundled and unrewritten.
	// It follows the body's other classic script with only a comment between,
	// so the two share a run and a chunk.
	const chunk = readChunk(scriptChunkUrls[1]);
	expect(chunk).toContain("__legacyTyped");
	expect(chunk).toContain("/* second script */");
	expect(pageContent).not.toContain("__legacyTyped");
});
