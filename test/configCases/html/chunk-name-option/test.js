const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name)).toString("utf-8");

// exec()-in-a-loop rather than String.prototype.matchAll, which is newer than
// the Node baseline the harness runs this bundle on.
const collectMatches = (str, regex) => {
	const out = [];
	let match;
	while ((match = regex.exec(str)) !== null) out.push(match[1]);
	return out;
};

const scriptUrls = (html) =>
	collectMatches(html, /<script[^>]*\bsrc="([^"]+)"/g);

it("should name every extracted chunk from the template", () => {
	const html = read("page.html");
	expect(html).toMatchSnapshot();

	// `[page]_[type]_[index]`: the run's leader, the async tag and the `src`
	// tag, each at the position its tag holds in the document.
	const urls = scriptUrls(html);
	expect(urls).toEqual([
		"page_script-module_0.mjs",
		"page_script-module_2.mjs",
		"page_script-module_3.mjs"
	]);
});

it("should merge a run under the name its leader claimed", () => {
	const urls = scriptUrls(read("page.html"));
	const merged = read(urls[0]);
	expect(merged).toContain("first");
	expect(merged).toContain("second");
	expect(merged.indexOf("first")).toBeLessThan(merged.indexOf("second"));
	// One chunk for the run, so its import is bundled once.
	expect(merged.match(/const push = \(name\)/g)).toHaveLength(1);
	// The async tag and the `src` tag stay chunks of their own.
	expect(read(urls[1])).toContain("async");
	expect(read(urls[2])).toContain("external");
});

it("should name a chunk with what the function returned", () => {
	const html = read("fn.html");
	expect(html).toMatchSnapshot();

	// The function is handed the page, the tag's own basename (empty for an
	// inline body), its position and what it is extracted as.
	expect(scriptUrls(html)).toEqual([
		"fn.inline.0.script-module.mjs",
		"fn.external.1.script-module.mjs"
	]);
});

it("should emit the file under the name the chunk claimed", () => {
	// A `src` tag is named after its url by default; the option decides
	// instead, so nothing is emitted as `external.mjs`.
	expect(fs.existsSync(path.resolve(__dirname, "external.mjs"))).toBe(false);
	expect(read("fn.external.1.script-module.mjs")).toContain("external");
});
