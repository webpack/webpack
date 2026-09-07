const fs = require("fs");
const path = require("path");

import page from "./page.html";

it("should name an imported page's script after that page", () => {
	// The page has no entry of its own, so its script is named after its file.
	expect(page).toContain("<title>Widget</title>");
	expect(fs.readdirSync(__dirname)).toContain("page.js");

	const js = fs.readFileSync(path.resolve(__dirname, "page.js"), "utf-8");
	expect(js).toContain("widget-script");
});
