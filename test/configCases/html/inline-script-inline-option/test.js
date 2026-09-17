const fs = require("fs");
const path = require("path");

it("should write a run's chunk into the page under `output.html.inline`", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "page.html"))
		.toString("utf-8");
	// One run holds both bodies, and the option writes its chunk into the tag
	// the run opened with.
	expect(html).toContain("option-body");
	expect(html).toContain("classic-option-body");
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	expect(html).not.toMatch(/<script[^>]*\bsrc=/);
	expect(fs.existsSync(path.resolve(__dirname, "page.mjs"))).toBe(false);
});
