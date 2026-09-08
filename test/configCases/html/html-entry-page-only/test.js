const fs = require("fs");
const path = require("path");

it("should emit only the page for an HTML entry with nothing to bundle", () => {
	const files = fs
		.readdirSync(__dirname)
		.filter((f) => f.endsWith(".js") || f.endsWith(".css") || f.endsWith(".html"));

	expect(files.sort()).toEqual(["page.html", "test.js"]);

	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain("<p>Hello</p>");
	expect(html).not.toContain("<script");
});
