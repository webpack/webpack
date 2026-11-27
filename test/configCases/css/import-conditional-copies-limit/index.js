import "./part0.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should stop copying stylesheets that conditional @import rules double", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toContain(".p0 {");
	expect(css).toContain(".end {");
	expect(css.length).toBeLessThan(1000000);
});
