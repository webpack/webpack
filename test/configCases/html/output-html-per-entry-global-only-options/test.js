const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.resolve(__dirname, "a.html"), "utf-8");

it("entry-level inline is not applied", () => {
	expect(html).toMatch(/<script[^>]* src="a\.js">/i);
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
});
