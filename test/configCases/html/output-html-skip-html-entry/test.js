const fs = require("fs");
const path = require("path");

it("does not double-wrap an actual HTML entry when output.html is true", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain("<title>Real HTML Entry</title>");
	// only the real document, not a synthetic data:text/html wrapper
	expect(html.match(/<!doctype html>/gi) || []).toHaveLength(1);
});
