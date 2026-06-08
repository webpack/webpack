const fs = require("fs");
const path = require("path");

it("leaves HTML entries to HtmlModulesPlugin and does not emit a duplicate", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain("<title>HTML Entry Page</title>");
	expect(fs.existsSync(path.resolve(__dirname, "main.html"))).toBe(false);
});
