import moduleText, { class as moduleTextClass } from "./module-text.css";
import autoText from "./auto-text.css";
import * as moduleTextNoEsm from "./module-text-no-esm.css";
import autoTextNoEsm from "./auto-text-no-esm.css";
import moduleWithImports from "./parent-module-with-imports.css";

it("should export CSS text as default when exportType is text (css/module)", () => {
	// default export should be CSS text
	expect(typeof moduleText).toBe("string");
	expect(moduleText).toMatchSnapshot();

	// named exports should still work
	expect(moduleTextClass).toBeTruthy();
});


it("should export CSS text as default when exportType is text (css/auto)", () => {
	// default export should be CSS text
	expect(typeof autoText).toBe("string");
	expect(autoText).toContain(".auto-text-class");
	expect(autoText).toContain("color: green");
});


it("should export CSS text when exportType is text and esModule is false (css/module)", () => {
	// When esModule is false, it's CommonJS style export
	// default export should be CSS text
	// named exports should still work
	expect(moduleTextNoEsm["no-esm-text"]).toBeTruthy();
	expect(moduleTextNoEsm).toMatchSnapshot();
});


it("should export CSS text when exportType is text and esModule is false (css/auto)", () => {
	// When esModule is false, it's CommonJS style export
	// default export should be CSS text
	expect(typeof autoTextNoEsm).toBe("string");
	expect(autoTextNoEsm).toContain(".auto-no-esm-text");
	expect(autoTextNoEsm).toContain("color: brown");
});

it("should handle @import with layer, supports, and media queries", () => {
	// default export should contain the CSS text with all imports resolved
	expect(typeof moduleWithImports).toBe("string");
	expect(moduleWithImports).toMatchSnapshot();
});