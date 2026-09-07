const fs = require("fs");
const path = require("path");

it("should not emit a JS copy of the page for an HTML entry", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("page.html");
	expect(files).toContain("page.js");

	// `page.js` is the script the parser split out of the page — it takes the
	// entry's filename, which no copy of the markup occupies any more.
	const js = fs.readFileSync(path.resolve(__dirname, "page.js"), "utf-8");
	expect(js).toContain("html-entry-script");
	expect(js).not.toContain("<!DOCTYPE html>");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatch(/<script src="page\.js">/);
});
