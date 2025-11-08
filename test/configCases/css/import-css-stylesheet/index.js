import sheet from "./basic.css" with { type: "css" };
import sheetAssert from "./basic.css" assert { type: "css" };

it("should import CSS as CSSStyleSheet with 'with' syntax", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(sheet.cssRules.length).toBeGreaterThan(0);
	
	// Check that the CSS content is correct
	const rules = Array.from(sheet.cssRules);
	const testRule = rules.find(rule => rule.selectorText === ".test");
	expect(testRule).toBeDefined();
	expect(testRule.style.color).toBe("red");
	expect(testRule.style.background).toBe("blue");
});

it("should import CSS as CSSStyleSheet with 'assert' syntax", () => {
	expect(sheetAssert).toBeInstanceOf(CSSStyleSheet);
	expect(sheetAssert.cssRules.length).toBeGreaterThan(0);
	
	// Check that the CSS content is correct
	const rules = Array.from(sheetAssert.cssRules);
	const testRule = rules.find(rule => rule.selectorText === ".test");
	expect(testRule).toBeDefined();
});

it("should be able to adopt the stylesheet", () => {
	// Test that the stylesheet can be adopted (basic API check)
	expect(typeof sheet.replaceSync).toBe("function");
});

it("should handle @import in CSSStyleSheet", () => {
	const rules = Array.from(sheet.cssRules);
	
	// Check that imported styles are included
	const importedRule = rules.find(rule => rule.selectorText === ".imported");
	expect(importedRule).toBeDefined();
	expect(importedRule.style.color).toBe("green");
	expect(importedRule.style["font-style"]).toBe("italic");
});

it("should handle url() for images in CSSStyleSheet", () => {
	const rules = Array.from(sheet.cssRules);
	
	// Check that the rule with background-image exists
	const imageRule = rules.find(rule => rule.selectorText === ".with-image");
	expect(imageRule).toBeDefined();
	expect(imageRule.style["background-image"]).toContain("url(");
	expect(imageRule.style.width).toBe("100px");
	expect(imageRule.style.height).toBe("100px");
});
