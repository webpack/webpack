import "./layer.css";
import "./media.css";
import "./anonymous-layer.css";
import "./plain.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep a stylesheet imported in a layer apart from one imported for a media", () => {
	const css = fs
		.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8")
		.replace(/\/\*[^]*?\*\//g, "");
	expect(css).toMatch(/@layer print \{\s*\.shared \{ color: red; \}\s*\}/);
	expect(css).toMatch(/@media print \{\s*\.shared \{ color: red; \}\s*\}/);
	expect(css).toMatch(/@layer \{\s*\.shared \{ color: red; \}\s*\}/);
	expect(css.match(/\.shared \{ color: red; \}/g)).toHaveLength(4);
});
