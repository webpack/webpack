import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import page from "./page.html";
import unclosed from "./unclosed.html";
import subPage from "./sub/page.html";
import classicPage from "./classic.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const readChunk = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

// The HTML module type is opaque to static analysis, so each imported page
// is normalized to a concrete string once.
const pageContent = typeof page === "string" ? page : "";
const unclosedContent = typeof unclosed === "string" ? unclosed : "";
const subContent = typeof subPage === "string" ? subPage : "";
const classicContent = typeof classicPage === "string" ? classicPage : "";

// Document-order list of every inline-script chunk url left in the page.
const scriptChunkUrls = [
	...pageContent.matchAll(/<script[^>]*\bsrc="(page\d*\.mjs)"/g)
].map((m) => m[1]);

it("should bundle a run of inline <script type=module> tags into one chunk", () => {
	expect(pageContent).toMatchSnapshot();

	// Six executable inline scripts, but the second module tag joined the
	// first one's chunk and is gone from the document.
	expect(scriptChunkUrls).toHaveLength(5);
	expect(new Set(scriptChunkUrls).size).toBe(5);

	const merged = readChunk(scriptChunkUrls[0]);
	expect(merged).toContain("module-1");
	expect(merged).toContain("module-2");
	// Both bodies run from one chunk, in the order their tags stood in.
	expect(merged.indexOf("module-1")).toBeLessThan(merged.indexOf("module-2"));
	// The shared import is one module in the merged chunk, not one per tag.
	expect(merged.match(/const push = \(name\)/g)).toHaveLength(1);
});

it("should keep an async inline module out of the run", () => {
	const asyncChunk = readChunk(scriptChunkUrls[1]);
	expect(asyncChunk).toContain("async-module");
	expect(asyncChunk).not.toContain("module-3");
	// The tag keeps its `async`, so it still evaluates whenever it loads.
	expect(pageContent).toMatch(/<script[^>]*\basync\b/);
});

it("should not merge across another script", () => {
	// An async module, then a classic body, each end the run they follow:
	// `module-3` and `module-4` keep chunks of their own.
	const third = readChunk(scriptChunkUrls[2]);
	const classic = readChunk(scriptChunkUrls[3]);
	const fourth = readChunk(scriptChunkUrls[4]);
	expect(third).toContain("module-3");
	expect(third).not.toContain("module-4");
	expect(classic).toContain("classic-body");
	expect(fourth).toContain("module-4");
	expect(fourth).not.toContain("module-3");
});

it("should leave no inline JS body in the page", () => {
	expect(pageContent).not.toContain("push(");
	expect(pageContent).not.toContain("classic-body");
	expect(pageContent).not.toContain('import { push }');
});

it("should drop a run member the input ended before closing", () => {
	expect(unclosedContent).toMatchSnapshot();

	const urls = [
		...unclosedContent.matchAll(/<script[^>]*\bsrc="(unclosed\d*\.mjs)"/g)
	].map((m) => m[1]);
	// The unterminated second tag has no `</script>` to remove with it, so the
	// element is cut at the end of its body.
	expect(urls).toHaveLength(1);
	expect(unclosedContent).not.toContain("unclosed-2");

	const merged = readChunk(urls[0]);
	expect(merged).toContain("unclosed-1");
	expect(merged).toContain("unclosed-2");
});

it("should keep two pages of the same basename apart", () => {
	const subUrl = subContent.match(/<script[^>]*\bsrc="(page\d*\.mjs)"/)[1];
	// Both pages are named `page`, so the second claims a numbered name
	// rather than a hash of its path.
	expect(scriptChunkUrls).not.toContain(subUrl);
	expect(readChunk(subUrl)).toContain("sub-module");
});

it("should bundle a run of classic inline scripts into one chunk", () => {
	expect(classicContent).toMatchSnapshot();

	const urls = [
		...classicContent.matchAll(/<script[^>]*\bsrc="(classic\d*\.mjs)"/g)
	].map((m) => m[1]);
	// Two classic bodies share a chunk; the module body after them starts a
	// run of its own, since the two kinds compile differently.
	expect(urls).toHaveLength(2);

	const classicChunk = readChunk(urls[0]);
	expect(classicChunk).toContain("classic-1");
	expect(classicChunk).toContain("classic-2");
	expect(classicChunk.indexOf("classic-1")).toBeLessThan(
		classicChunk.indexOf("classic-2")
	);

	const moduleChunk = readChunk(urls[1]);
	expect(moduleChunk).toContain("after-classic");
	expect(moduleChunk).not.toContain("classic-1");
});
