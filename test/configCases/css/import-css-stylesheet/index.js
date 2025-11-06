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
	expect(typeof sheet.replace).toBe("function");
});

