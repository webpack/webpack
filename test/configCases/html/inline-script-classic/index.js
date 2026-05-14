const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const readChunk = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

// `require("./page.html")` always returns the HTML body as a string, but
// static analysis can't see through the HTML module type, so normalize
// once at the top so the rest of the file accesses a concrete string.
const pageContent = typeof page === "string" ? page : "";

// `String.prototype.matchAll` requires Node 12+, but this test stays on
// Node 10-compatible CJS so we collect all matches via a `regex.exec`
// loop with the `g` flag.
const collectMatches = (str, regex) => {
	const out = [];
	let m;
	while ((m = regex.exec(str)) !== null) out.push(m);
	return out;
};

it("should rewrite inline <script> tags and drop `type=module` when output.module is off", () => {
	expect(typeof page).toBe("string");
	expect(pageContent).toMatchSnapshot();

	// The inline JS bodies were extracted into chunks.
	expect(pageContent).not.toContain("var greeting");
	expect(pageContent).not.toContain("var counter");
	expect(pageContent).not.toContain("__inlineModuleSum");

	// Classic inline `<script>` (no `type`) stays without a type attribute
	// — the auto type=module upgrade only runs when `output.module` is on.
	expect(pageContent).toMatch(
		/<script src="__html_[^"]+\.chunk\.js"><\/script>/
	);
	// `type="text/javascript"` stays as-is (classic-compatible).
	expect(pageContent).toMatch(
		/<script src="__html_[^"]+\.chunk\.js" type="text\/javascript"><\/script>/
	);
	// `type="module"` is REMOVED — the emitted chunk is a classic IIFE,
	// loading it under module semantics would be wrong.
	expect(pageContent).not.toMatch(/<script[^>]*\btype="module"/);
	// Non-executable types still flow through unchanged.
	expect(pageContent).toMatch(
		/<script type="application\/ld\+json">[\s\S]*<\/script>/
	);
});

it("should emit classic IIFE-wrapped chunks for inline <script> bodies", () => {
	// First executable inline script in document order is the classic
	// `<script>` with the `<b>hello</b>` body.
	const classicChunkName = pageContent.match(
		/<script src="(__html_[^"]+\.chunk\.js)"><\/script>/
	)[1];
	const classicChunk = readChunk(classicChunkName);
	expect(classicChunk).toMatchSnapshot();
	// Classic format: IIFE bootstrap wraps the runtime + entry module.
	expect(classicChunk).toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(classicChunk).toContain("// webpackBootstrap");
	// The original inline JS is preserved inside the chunk.
	expect(classicChunk).toContain('console.log("<b>hello</b>")');
	expect(classicChunk).toContain('var greeting = "hi"');
});

it("should emit IIFE-wrapped chunks for inline <script type=module> too (no output.module)", () => {
	// All inline-script chunks are in document order via `src` attributes;
	// the module-origin chunk is the second.
	const chunkUrls = collectMatches(
		pageContent,
		/<script[^>]*\bsrc="(__html_[^"]+\.chunk\.js)"/g
	).map((m) => m[1]);
	const moduleChunk = readChunk(chunkUrls[1]);
	expect(moduleChunk).toMatchSnapshot();
	// Chunk format follows `output.module` (off here) → IIFE wrap, regardless
	// of the original `<script type="module">` annotation.
	expect(moduleChunk).toMatch(/^\/\*+\/ \(\(\) => \{/);
	expect(moduleChunk).toContain("// webpackBootstrap");
	// The original ESM source still appears verbatim in the bundled chunk.
	expect(moduleChunk).toContain("__inlineModuleSum");
	expect(moduleChunk).toContain("[1, 2, 3]");
});

it("should emit classic chunks for every inline-script body when output.module is off (mixed case)", () => {
	// Without `output.module` every inline-script chunk — whether the
	// source came from classic `<script>`, `<script type="text/javascript">`
	// or `<script type="module">` — is rendered in classic format. Classic
	// and module-typed inline scripts go into separate `dependOn` groups,
	// so each group has its own IIFE-wrapped leader; followers within a
	// group reuse the leader's runtime via the `webpackChunk` push
	// pattern. Neither form uses ES-module `import`/`export` at top
	// level.
	const allChunkUrls = collectMatches(
		pageContent,
		/<script[^>]*\bsrc="(__html_[^"]+\.chunk\.js)"/g
	).map((m) => m[1]);
	expect(allChunkUrls).toHaveLength(3);
	const chunks = allChunkUrls.map(readChunk);
	// Each chunk is classic — either an IIFE leader or a `webpackChunk`
	// push follower.
	for (const chunk of chunks) {
		const isLeader =
			/^\/\*+\/ \(\(\) => \{/.test(chunk) &&
			chunk.includes("// webpackBootstrap");
		const isFollower = chunk.includes('self["webpackChunk"]');
		expect(isLeader || isFollower).toBe(true);
		expect(chunk).not.toMatch(/^import\s/m);
		expect(chunk).not.toMatch(/^export\s/m);
	}
});
