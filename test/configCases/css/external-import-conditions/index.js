import "./style.css";
import text from "./text.css" with { type: "text" };
import sheet from "./sheet.css" with { type: "css" };

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readCss = () =>
	fs
		.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8")
		.replace(/\/\*[^]*?\*\//g, "");

it("should give an external @import the conditions of the stylesheets importing it", () => {
	expect(readCss()).toContain(
		'@import url("https://test.cases/nested.css") layer(base) supports(display: grid) screen;'
	);
});

it("should keep each external @import of one url with its own conditions", () => {
	const css = readCss();
	expect(css).toContain('@import url("https://test.cases/print.css") print;');
	expect(css).toContain(
		'@import url("https://test.cases/print.css") layer(theme) screen;'
	);
	expect(css).toContain('@import url("https://test.cases/print.css") layer;');
});

it("should keep an external @import of a text stylesheet in its text", () => {
	expect(text).toContain('@import url("https://test.cases/sheet.css");');
	expect(text).toContain(".text { color: green; }");
	expect(readCss()).not.toContain("sheet.css");
});

it("should keep an external @import of a css-style-sheet module out of the document css", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(readCss()).not.toContain("in-sheet.css");
});
