import textA from "./text-a.css";
import textB from "./text-b.css";
import sheetA from "./sheet-a.css";
import sheetB from "./sheet-b.css";
import { "link-a-class" as linkAClass } from "./link-a.module.css";
import { "link-b-class" as linkBClass } from "./link-b.module.css";

it("should concatenate text exportType modules", () => {
	expect(typeof textA).toBe("string");
	expect(textA).toContain("color: red");
	expect(textA).toContain("font-size: 12px");

	expect(typeof textB).toBe("string");
	expect(textB).toContain("color: blue");
});

it("should concatenate css-style-sheet exportType modules", () => {
	expect(sheetA).toBeInstanceOf(CSSStyleSheet);
	expect(sheetA._cssText).toContain("color: green");
	expect(sheetA._cssText).toContain("font-weight: bold");

	expect(sheetB).toBeInstanceOf(CSSStyleSheet);
	expect(sheetB._cssText).toContain("color: purple");
});

it("should concatenate link exportType (CSS modules) and export class names", () => {
	expect(typeof linkAClass).toBe("string");
	expect(linkAClass.length).toBeGreaterThan(0);
	expect(typeof linkBClass).toBe("string");
	expect(linkBClass.length).toBeGreaterThan(0);
	expect(linkAClass).not.toBe(linkBClass);
});

it("should concatenate all modules into one concatenated module", () => {
	const concatModules = __STATS__.modules.filter(m => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + 2 text + 1 text-dep + 2 sheet + 1 sheet-dep + 2 link + 1 link-dep = 10
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(10);
});
