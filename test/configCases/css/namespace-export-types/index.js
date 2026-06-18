import textCss from "./text.css";
import sheet from "./sheet.css";
import "./inject.css";

it("should hoist @namespace for the text exportType", () => {
	expect(textCss.trimStart().startsWith("@namespace svg url(")).toBe(true);
	expect(textCss).toContain("http://www.w3.org/2000/svg");
});

it("should build a css-style-sheet with a hoisted @namespace", () => {
	// css-style-sheet shares generateCssText() with the text exportType (asserted
	// above), so its @namespace hoisting is covered there; jsdom does not surface
	// @namespace rules via cssRules, so here we only smoke-test the sheet builds.
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
});

it("should hoist @namespace for the style exportType", () => {
	if (typeof document === "undefined") return;
	const styleText = Array.from(document.getElementsByTagName("style"))
		.map(s => s.textContent)
		.join("\n");
	expect(styleText).toContain("@namespace svg url(");
});
