const fs = require("fs");
const path = require("path");

it("should resolve an inlined chunk through the chunk hash when no content hash is set", () => {
	const html = fs
		.readFileSync(path.resolve(__dirname, "main.html"))
		.toString("utf-8");
	// Every sentinel resolved: none is left in the emitted page.
	expect(html).not.toContain("__WEBPACK_HTML_INLINE__");
	expect(html).toContain("<style>");
	expect(html).toContain("body { color: red; }");
	expect(html).toContain("<script>");
});
