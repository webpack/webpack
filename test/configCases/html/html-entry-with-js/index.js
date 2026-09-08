const fs = require("fs");
const path = require("path");

it("should keep the extracted script's name when the entry also bundles JS", () => {
	const files = fs.readdirSync(__dirname);
	expect(files).toContain("page.html");
	expect(files).toContain("page.js");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	// `page.js` is this bundle, so the page's script cannot take that name.
	expect(html).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);
});
