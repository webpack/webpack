const fs = require("fs");
const path = require("path");

it("should write a minified inline chunk with one statement terminator", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "page.html"))
		.toString("utf-8");
	expect(html).toContain("minified-body");
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	// The chunk ends its own statement; the minifier ran over the sentinel
	// first and ended that one too.
	expect(html).not.toContain(";;");
	expect(html).toMatch(/;<\/script>/);
});
