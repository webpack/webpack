import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep a css url() matched by a JavaScript external as written", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toContain("url(./icon.png)");
	const js = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");
	// built here, so this file's own text does not contain it
	expect(js).not.toContain(["require(", '"./icon.png")'].join(""));
});
