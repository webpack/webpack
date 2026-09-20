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

it("should name a chunk after the comment before its tag", () => {
	const html = read("page.html");
	expect(html).toMatchSnapshot();
	// The comment wins over `output.html.chunkName`, which would have named
	// these `option-<index>`.
	expect(scriptUrls(html)).toEqual([
		"header.mjs",
		"footer.mjs",
		"vendor.mjs"
	]);
});

it("should let a named tag carry the run that follows it", () => {
	const header = read("header.mjs");
	expect(header).toContain("head-1");
	expect(header).toContain("head-2");
	expect(header.indexOf("head-1")).toBeLessThan(header.indexOf("head-2"));
	// The next comment names a tag of its own, so the run ends there.
	const footer = read("footer.mjs");
	expect(footer).toContain("foot");
	expect(footer).not.toContain("head-1");
});

it("should name an external tag's chunk too", () => {
	expect(read("vendor.mjs")).toContain("external");
	// Named, so it is not emitted after its url any more.
	expect(fs.existsSync(path.resolve(__dirname, "external.mjs"))).toBe(false);
});

it("should warn and fall back when the comment names nothing usable", () => {
	const html = read("bad.html");
	// The value is not a string, so the option names the chunk instead.
	expect(scriptUrls(html)).toEqual(["option-0.mjs"]);
	expect(read("option-0.mjs")).toContain("unnamed");
});

it("should name a linked page's own file too", () => {
	const html = read("linked.html");
	// The page is emitted under the name the link asked for, and the link is
	// rewritten to it rather than to `other.html`.
	expect(html).toContain('href="docs.html"');
	expect(fs.existsSync(path.resolve(__dirname, "other.html"))).toBe(false);
	expect(read("docs.html")).toContain("<title>Linked page</title>");
});

it("should emit one page when two of them link it under one name", () => {
	// The second link claims a name the same page already holds, so it shares
	// that page rather than asking for a second copy of it.
	expect(read("linked2.html")).toContain('href="docs.html"');
	expect(read("docs.html")).toContain("<title>Linked page</title>");
});

it("should keep names apart when the page asks for one twice", () => {
	const urls = scriptUrls(read("collide.html"));
	// The third tag asks for a taken name, and the position it falls back to
	// is taken by the first, so it counts on from there.
	expect(urls).toEqual(["dup-2.mjs", "dup.mjs", "dup-3.mjs"]);
	expect(new Set(urls).size).toBe(3);
	expect(read("dup-2.mjs")).toContain("first-dup");
	expect(read("dup.mjs")).toContain("second-dup");
	expect(read("dup-3.mjs")).toContain("third-dup");
});
