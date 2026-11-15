const fs = require("fs");
const path = require("path");

it("should bundle remote stylesheets when HTTP builds are enabled", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatchSnapshot();
	expect(html).not.toContain("https://");
	expect(fs.readFileSync(path.resolve(__dirname, "print.css"), "utf-8"))
		.toMatchSnapshot();
});
