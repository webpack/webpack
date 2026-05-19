import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

// `import page from "./page.html"` always returns the HTML body as a
// string, but static analysis can't see through the HTML module type, so
// it flags property access on `page` as possibly-undefined. Normalize
// once at the top so the rest of the file accesses a concrete string.
const pageContent = typeof page === "string" ? page : "";

// Document-order list of every inline-script chunk url emitted into the page.
const scriptChunkUrls = [
	...pageContent.matchAll(/<script[^>]*\bsrc="(__html_[^"]+)"/g)
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

	// Four executable inline scripts (3 classic + 1 module) → four chunk urls.
	expect(scriptChunkUrls).toHaveLength(4);

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
	// With `output.module` on every classic inline `<script>` gets
	// `type="module"` auto-inserted so the emitted ES-module chunk loads
	// correctly. The inline `<script type="module">` already had it, so
	// every executable inline script ends up as `type="module"` in the
	// output.
	const moduleTaggedSrcs = [
		...pageContent.matchAll(
			/<script[^>]*\btype="module"[^>]*\bsrc="(__html_[^"]+)"/g
		),
		...pageContent.matchAll(
			/<script[^>]*\bsrc="(__html_[^"]+)"[^>]*\btype="module"/g
		)
	].map((m) => m[1]);
	expect(new Set(moduleTaggedSrcs).size).toBe(4);
});

it("should bundle each classic inline <script> body into its own chunk", () => {
	const chunks = scriptChunkUrls.map(readChunk);
	expect(chunks[0]).toContain('console.log("<b>hello</b>")');
	expect(chunks[0]).toContain('var greeting = "hi"');
	// chunks[1] is the module-typed inline script (see next test).
	expect(chunks[2]).toContain("var counter");
	expect(chunks[2]).toContain('"<div><span>nested</span></div>"');
	expect(chunks[2]).toContain("return a < b");
	expect(chunks[3]).toContain("/* second script */");
	expect(chunks[3]).toContain('document.createTextNode("done")');
});

it("should bundle inline <script type=module> as an ES-module chunk", () => {
	// The `<script type="module">` is the second executable script in
	// document order (after the first classic inline script).
	const moduleChunk = readChunk(scriptChunkUrls[1]);
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
	// With `output.module` on, the chunk format follows the option, not
	// the original `<script>` annotation. Every inline-script chunk — both
	// the ones whose source came from classic `<script>` and the one from
	// `<script type="module">` — is an ES module: no IIFE bootstrap, no
	// CommonJS `module.exports`.
	for (const url of scriptChunkUrls) {
		const chunk = readChunk(url);
		expect(chunk).not.toMatch(/^\/\*+\/ \(\(\) => \{/);
		expect(chunk).not.toContain("// webpackBootstrap");
		expect(chunk).not.toContain("module.exports =");
	}
});
