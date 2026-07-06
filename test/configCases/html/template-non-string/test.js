const fs = require("fs");
const path = require("path");

it("should emit an error when the template option returns a non-string", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatch(/<!--\s*webpack error:/);
	expect(html).toContain("must return a string");
});
