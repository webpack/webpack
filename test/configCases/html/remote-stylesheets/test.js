const fs = require("fs");
const path = require("path");

it("should preserve remote stylesheet links and bundle local stylesheets", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatchSnapshot();
	expect(html).toContain("https://fonts.googleapis.com/css2?");
	expect(html).toContain('href="style/style.css"');
	expect(fs.existsSync(path.resolve(__dirname, "style/style.css"))).toBe(true);
	expect(fs.existsSync(path.resolve(__dirname, "script"))).toBe(false);
});
