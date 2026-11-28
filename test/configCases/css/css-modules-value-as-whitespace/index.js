import * as style from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should read an @value import with a long run of spaces in linear time", () => {
	expect(style.text).toBeDefined();
	expect(style.main).toBe("red");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toMatch(/color: red;/);
});
