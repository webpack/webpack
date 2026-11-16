import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep a stylesheet @import out of shared modules", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toContain(".shared-styles { color: red; }");
	expect(css).toContain(".app { color: blue; }");
});
