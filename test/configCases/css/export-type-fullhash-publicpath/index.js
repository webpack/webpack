import textCss from "./text.css";
import sheet from "./sheet.css";
import "./inject.css";

const PLACEHOLDER = "__WEBPACK_CSS_PUBLIC_PATH_FULL_HASH_";

it("should substitute [fullhash] in url() for text exportType", () => {
	expect(textCss).toContain("https://example.com/");
	expect(textCss).not.toContain(PLACEHOLDER);
});

it("should substitute [fullhash] in url() for css-style-sheet exportType", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const cssText = Array.from(sheet.cssRules)
		.map(r => r.cssText)
		.join("\n");
	expect(cssText).toContain("https://example.com/");
	expect(cssText).not.toContain(PLACEHOLDER);
});

it("should substitute [fullhash] in url() for style exportType", () => {
	if (typeof document === "undefined") return;
	const styles = document.getElementsByTagName("style");
	const allStyleText = Array.from(styles)
		.map(s => s.textContent)
		.join("\n");
	expect(allStyleText).toContain("https://example.com/");
	expect(allStyleText).not.toContain(PLACEHOLDER);
});
