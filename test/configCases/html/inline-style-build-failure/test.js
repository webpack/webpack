const fs = require("fs");
const path = require("path");

const deep = "(".repeat(50000);

it("should leave the inline styles the CSS parser failed on as written", () => {
	const html = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(html).toContain(".ok { color : green }");
	expect(html).toContain(`<style>.deep { b: ${deep} }</style>`);
	expect(html).toContain(`<div style="b: ${deep}">`);
	expect(html).toContain(`<svg><style>.svg { b: ${deep} }</style></svg>`);
});
