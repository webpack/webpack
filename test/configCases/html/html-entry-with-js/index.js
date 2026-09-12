const fs = require("fs");
const path = require("path");

it("should keep the extracted script's name when the entry also bundles JS", () => {
	const files = fs.readdirSync(__dirname);
	expect(files).toContain("page.html");
	expect(files).toContain("page.js");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// `page.js` is this bundle; the page's script takes its own url's name.
	expect(html).toMatch(/<script src="script\.js">/);
	expect(files).toContain("script.js");
});
