const fs = require("fs");
const path = require("path");

it("should not emit a JS asset for an HTML entry", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("page.html");
	expect(files).not.toContain("page.js");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// The page loads the script the parser split out of it, not the entry chunk.
	expect(html).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);
	expect(html).not.toContain("page.js");
});
