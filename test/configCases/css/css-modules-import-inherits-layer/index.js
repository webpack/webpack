import "./style.css";
import sheet from "./sheet.module.css" with { type: "css" };
import repeatSheet from "./sheet-repeat.module.css" with { type: "css" };
import edgeSheet from "./sheet-edge.module.css" with { type: "css" };

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should put the modules a stylesheet composes from in its layer", () => {
	const css = fs
		.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8")
		.replace(/\/\*[^]*?\*\//g, "");
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{ color: blue; \}\s*\}/);
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{ color: green; \}\s*\}/);
	expect(css).toMatch(/@layer base \{\s*\.[\w-]+ \{\s*color: red;\s*\}\s*\}/);
	expect(css).not.toMatch(/^\.[\w-]+ \{ color: (?:blue|green); \}/m);
});

it("should put the modules a sheet composes from in the sheet, once each", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const text = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
	expect(text.match(/color: purple/g)).toHaveLength(1);
	expect(text.match(/color: teal/g)).toHaveLength(1);
	expect(text).toMatch(/color: orange/);
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).not.toContain("purple");
});

it("should keep a repeated @import of a composed module last in a sheet", () => {
	const text = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
	expect(text.lastIndexOf("maroon")).toBeGreaterThan(text.indexOf("olive"));
	expect(text.indexOf("olive")).toBeGreaterThan(-1);
});

it("should keep a repeated @import inside a module composed twice over", () => {
	const text = Array.from(repeatSheet.cssRules, (rule) => rule.cssText).join("\n");
	expect(text.indexOf("olive")).toBeGreaterThan(-1);
	expect(text.lastIndexOf("maroon")).toBeGreaterThan(text.indexOf("olive"));
	expect(text.match(/color: navy/g)).toHaveLength(1);
});

it("should keep a repeated @import of a module that is also composed", () => {
	const text = Array.from(edgeSheet.cssRules, (rule) => rule.cssText).join("\n");
	expect(text.indexOf("indigo")).toBeGreaterThan(-1);
	expect(text.lastIndexOf("sienna")).toBeGreaterThan(text.indexOf("indigo"));
});
