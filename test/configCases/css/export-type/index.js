import moduleText, { class as moduleTextClass } from "./module-text.css";
import autoText from "./auto-text.css";
import * as moduleTextNoEsm from "./module-text-no-esm.css";
import autoTextNoEsm from "./auto-text-no-esm.css";
import moduleWithImports from "./parent-module-with-imports.css";

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
	expect(moduleTextNoEsm["no-esm-text"]).toBeTruthy();
	expect(moduleTextNoEsm).toMatchSnapshot();
});


it("should export CSS text when exportType is text and esModule is false (css/auto)", () => {
	expect(typeof autoTextNoEsm).toBe("string");
	expect(autoTextNoEsm).toContain(".auto-no-esm-text");
	expect(autoTextNoEsm).toContain("color: brown");
});

it("should handle @import with layer, supports, and media queries", () => {
	expect(typeof moduleWithImports).toBe("string");
	expect(moduleWithImports).toMatchSnapshot();
});