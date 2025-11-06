import moduleText, { class as moduleTextClass } from "./module-text.css";
import autoText from "./auto-text.css";
import * as moduleTextNoEsm from "./module-text-no-esm.css";
import autoTextNoEsm from "./auto-text-no-esm.css";
import moduleWithImports from "./module-with-imports.css";
import parentModuleWithImports from "./parent-module-with-imports.css";
import stylesheet from "./stylesheet.css";
import moduleStylesheet, { secondary as moduleStylesheetSecondary } from "./module-stylesheet.css";

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
