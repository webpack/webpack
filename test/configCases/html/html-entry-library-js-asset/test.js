const fs = require("fs");
const path = require("path");

it("should keep the JS asset of an HTML entry exposed as a library", () => {
	const files = fs.readdirSync(__dirname);

	expect(files).toContain("page.html");
	expect(files).toContain("page.js");

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatch(/<script src="__html_[a-f0-9]+_0\.chunk\.js">/);

	// The library hands back the page markup.
	expect(require("./page.js")).toContain("<title>HTML entry exposed as a library</title>");
});
