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
