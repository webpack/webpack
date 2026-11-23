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

it("should merge media types containing comments and escapes", () => {
	const css = readCss();
	expect(css).toContain('@import url("https://test.cases/comment.css") screen;');
	expect(css).toContain('@import url("https://test.cases/escaped.css") screen;');
	expect(css).toContain(
		'@import url("https://test.cases/only.css") only screen and (color);'
	);
	expect(css).toContain('@import url("https://test.cases/negated.css") screen;');
});

it("should keep an external @import of a text stylesheet in its text", () => {
	expect(text).toContain('@import url("https://test.cases/in-text.css");');
	expect(text).toContain(".text { color: green; }");
	expect(readCss()).not.toContain("in-text.css");
});

it("should load an external @import of a css-style-sheet module with the page", () => {
	// a constructed stylesheet ignores @import, so the page's css holds it
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(readCss()).toContain('@import url("https://test.cases/in-sheet.css");');
});
