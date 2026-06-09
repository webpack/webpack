const fs = require("fs");
const path = require("path");

it("wraps a CSS entry with only a stylesheet link, no script", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "styles.html"), "utf-8");
	expect(html).toMatch(/<link rel="stylesheet" href="[^"]+\.css">/);
	expect(html).not.toMatch(/__html_[^"]*\.js/);
});
