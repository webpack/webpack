import textCss from "./style.css";
import sheet from "./style-for-sheet.css";
import "./style-for-inject.css";

it("should resolve url() relative to output root for text exportType", () => {
	// url() in non-link CSS is resolved relative to the document, not any output file.
	// undoPath should be "" regardless of cssFilename/jsFilename configuration.
	expect(textCss).toContain("url(images/img.png)");
	expect(textCss).not.toContain("url(../images/img.png)");
});

it("should resolve url() relative to output root for css-style-sheet exportType", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const cssText = Array.from(sheet.cssRules).map(r => r.cssText).join("\n");
	expect(cssText).toContain("images/img.png");
	expect(cssText).not.toContain("../images/img.png");
});

it("should resolve url() relative to output root for style exportType", () => {
	if (typeof document === "undefined") return;
	const styles = document.getElementsByTagName("style");
	const allStyleText = Array.from(styles).map(s => s.textContent).join("\n");
	expect(allStyleText).toContain("images/img.png");
	expect(allStyleText).not.toContain("../images/img.png");
});
