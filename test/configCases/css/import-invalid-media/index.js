import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should keep a stylesheet imported with an invalid media query inside its wrappers", () => {
	expect(css()).toMatch(
		/@layer y \{\n\t@supports \(display: grid\) \{\n\t\t@media not all \{\n\t\t\t\.c \{\n\t\t\t\tcolor: green;\n\t\t\t\}\n\t\t\}\n\t\}\n\}/
	);
});

it("should only drop the invalid query of a media query list", () => {
	expect(css()).toMatch(/@media screen, not all \{\n\t\.d \{/);
});
