import moduleText, { class as moduleTextClass } from "./module-text.css";
import autoText from "./auto-text.css";
import * as moduleTextNoEsm from "./module-text-no-esm.css";
import autoTextNoEsm from "./auto-text-no-esm.css";
import moduleWithImports from "./module-with-imports.css";
import parentModuleWithImports from "./parent-module-with-imports.css";
import stylesheet from "./stylesheet.css";
import moduleStylesheet, { secondary as moduleStylesheetSecondary } from "./module-stylesheet.css";
import icssText, { button as icssTextButton } from "./icss-text.modules.css";
import icssStylesheet, { "sheet-button" as icssStylesheetButton } from "./icss-stylesheet.modules.css";

it("should export CSS text as default when exportType is text (css/module)", () => {
	expect(typeof moduleText).toBe("string");
	expect(moduleText).toMatchSnapshot();

	expect(moduleTextClass).toBeTruthy();
});


it("should export CSS text as default when exportType is text (css/auto)", () => {
	expect(typeof autoText).toBe("string");
	expect(autoText).toContain(".auto-text-class");
	expect(autoText).toContain("color: green");
});


it("should export CSS text when exportType is text and esModule is false (css/module)", () => {
	// Named export, warn
	expect(moduleTextNoEsm["no-esm-text"]).toBeTruthy();
	expect(moduleTextNoEsm.default["no-esm-text"]).toBeTruthy();
	expect(moduleTextNoEsm).toMatchSnapshot();
});


it("should export CSS text when exportType is text and esModule is false (css/auto)", () => {
	expect(typeof autoTextNoEsm).toBe("string");
	expect(autoTextNoEsm).toContain(".auto-no-esm-text");
	expect(autoTextNoEsm).toContain("color: brown");
});

it("should handle @import with layer, supports, and media queries", () => {
	expect(typeof moduleWithImports).toBe("string");
	expect(typeof parentModuleWithImports).toBe("string");
	expect(parentModuleWithImports).toMatchSnapshot();
});

it("should handle ICSS :import with exportType text", () => {
	expect(typeof icssText).toBe("string");
	expect(typeof icssTextButton).toBe("string");
	expect(icssText).toContain("background-color: #007bff");
	expect(icssText).toContain("border-color: #6c757d");
	expect(icssText).toContain("padding: 16px");
});

it("should handle ICSS :import with exportType css-style-sheet", () => {
	expect(typeof icssStylesheetButton).toBe("string");
	expect(icssStylesheet).toBeInstanceOf(CSSStyleSheet);
	expect(icssStylesheet.cssRules.length).toBeGreaterThan(0);

	const rules = Array.from(icssStylesheet.cssRules);
	const buttonRule = rules.find(rule => rule.selectorText && rule.selectorText.includes("sheet-button"));
	expect(buttonRule).toBeDefined();
	expect(buttonRule.style["background-color"]).toBe("#007bff");
	expect(buttonRule.style.color).toBe("white");

	const badgeRule = rules.find(rule => rule.selectorText && rule.selectorText.includes("sheet-badge"));
	expect(badgeRule).toBeDefined();
	expect(badgeRule.style["background-color"]).toBe("#6c757d");
	expect(badgeRule.style["border-radius"]).toBe("4px");
});

it("should export CSSStyleSheet when exportType is css-style-sheet (css/auto)", () => {
	expect(stylesheet).toBeInstanceOf(CSSStyleSheet);
	expect(stylesheet.cssRules.length).toBeGreaterThan(0);

	const rules = Array.from(stylesheet.cssRules);
	const stylesheetRule = rules.find(rule => rule.selectorText === ".stylesheet-class");
	expect(stylesheetRule).toBeDefined();
	expect(stylesheetRule.style.color).toBe("purple");
	expect(stylesheetRule.style["font-weight"]).toBe("bold");
});

it("should export CSSStyleSheet when exportType is css-style-sheet (css/module)", () => {
	expect(typeof moduleStylesheetSecondary).toBe("string");
	expect(moduleStylesheet).toBeInstanceOf(CSSStyleSheet);
	expect(moduleStylesheet.cssRules.length).toBeGreaterThan(0);

	const rules = Array.from(moduleStylesheet.cssRules);
	const moduleRule = rules.find(rule => rule.selectorText && rule.selectorText.includes("module-stylesheet"));
	expect(moduleRule).toBeDefined();
	expect(moduleRule.style.color).toBe("orange");
	expect(moduleRule.style.padding).toBe("20px");
});

it("should export URL string when exportType is url", () => {
	const urlCss = new URL("./url.css", import.meta.url);
	expect(urlCss.href).toMatch(/bundle\.[^.]+\.([a-f0-9]+)\.css$/);
});
