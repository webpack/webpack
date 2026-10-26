const fs = require("fs");
const path = require("path");

it("should cancel a relative <base href> in the urls of an inlined stylesheet", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).not.toContain("<link");
	expect(html).toMatch(/<style>[^<]*url\(\.\.\/[^)]+\.png\)/);
});
