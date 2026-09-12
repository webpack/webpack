const fs = require("fs");
const path = require("path");

import page from "./page.html";

it("should name an imported page's script after its src", () => {
	// The page has no entry of its own; its script is named after its url.
	expect(page).toContain("<title>Widget</title>");
	expect(fs.readdirSync(__dirname)).toContain("widget.js");

	const js = fs.readFileSync(path.resolve(__dirname, "widget.js"), "utf-8");
	expect(js).toContain("widget-script");
});
