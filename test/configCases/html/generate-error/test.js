const fs = require("fs");
const path = require("path");

it("should emit an HTML error comment when the module build fails", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toMatch(/<!--\s*webpack error:/);
	expect(html).not.toContain("<error>");
});
