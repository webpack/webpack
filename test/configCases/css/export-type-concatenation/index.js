import text from "./text-main.css";
import sheet from "./sheet-main.css";

it("should concatenate text exportType with @imported dep", () => {
	expect(typeof text).toBe("string");
	expect(text).toContain("color: red");
	expect(text).toContain("font-size: 12px");
});

it("should concatenate css-style-sheet exportType with @imported dep", () => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	const cssText = sheet._cssText;
	expect(cssText).toContain("color: blue");
	expect(cssText).toContain("font-size: 12px");
});

it("should concatenate all modules into one concatenated module", () => {
	const concatModules = __STATS__.modules.filter(m => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + text-main + sheet-main + dep.css instances
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(4);
});
