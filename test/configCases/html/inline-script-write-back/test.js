const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name)).toString("utf-8");

it("should write a run's chunk into the tag a `webpackInline` comment marks", () => {
	const html = read("page.html");
	// The comment sits before the run's second tag, and a run is one chunk, so
	// the whole run is written into the page.
	expect(html).toContain("first-body");
	expect(html).toContain("second-body");
	expect(html.indexOf("first-body")).toBeLessThan(html.indexOf("second-body"));
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	// Nothing is fetched for it, and the chunk it would have fetched is gone.
	expect(html).not.toMatch(/<script[^>]*\bsrc=/);
	expect(fs.existsSync(path.resolve(__dirname, "page.mjs"))).toBe(false);
});

it("should leave an unmarked page fetching its chunk", () => {
	const html = read("plain.html");
	expect(html).toMatchSnapshot();
	const match = html.match(/<script[^>]*\bsrc="([^"]+)"/);
	expect(match).not.toBe(null);
	expect(html).not.toContain("plain-body");
	expect(read(match[1])).toContain("plain-body");
});
