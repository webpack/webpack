const fs = require("fs");
const path = require("path");

it("should keep the JS asset of an entry that includes more than its page", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("page.html");
	expect(files).toContain("main.js");
	expect(files).toContain("page.js");

	// The entry is not the page alone, so it keeps the entry filename and the
	// extracted script is named after the page's file.
	const main = fs.readFileSync(path.resolve(__dirname, "main.js"), "utf-8");
	expect(main).toContain("included");

	const script = fs.readFileSync(path.resolve(__dirname, "page.js"), "utf-8");
	expect(script).toContain("html-entry-script");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatch(/<script src="page\.js">/);
});
