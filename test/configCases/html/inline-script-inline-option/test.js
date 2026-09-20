const fs = require("fs");
const path = require("path");

it("should write a run's chunk into the page under an `output.html.inline` pattern", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "page.html"))
		.toString("utf-8");
	// The pattern names the page the run is emitted under, not the synthetic
	// entry the parser minted for it.
	expect(html).toContain("option-body");
	expect(html).toContain("classic-option-body");
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	expect(html).not.toMatch(/<script[^>]*\bsrc=/);
	expect(fs.existsSync(path.resolve(__dirname, "page.mjs"))).toBe(false);
});
