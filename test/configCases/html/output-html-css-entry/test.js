const fs = require("fs");
const path = require("path");

it("should emit only the page and its stylesheet for a CSS entry", () => {
	const files = fs
		.readdirSync(__dirname)
		.filter((f) => f.endsWith(".js") || f.endsWith(".css") || f.endsWith(".html"));

	expect(files.sort()).toEqual(["page.css", "page.html", "test.js"]);

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain('<link rel="stylesheet" href="page.css">');
	expect(html).not.toContain("<script");
});
