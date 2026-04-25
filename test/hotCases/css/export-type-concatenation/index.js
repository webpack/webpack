import textA from "./text-a.css";
import textB from "./text-b.css";
import sheetA from "./sheet-a.css";
import sheetB from "./sheet-b.css";
import "./style-a.css";
import "./style-b.css";
import { "link-a-class" as linkAClass } from "./link-a.module.css";
import { "link-b-class" as linkBClass } from "./link-b.module.css";

it("should handle HMR for all exportTypes with concatenation", function (done) {
	// Initial state: text
	expect(typeof textA).toBe("string");
	expect(textA).toContain("color: red");
	expect(textA).toContain("font-size: 12px");
	expect(typeof textB).toBe("string");
	expect(textB).toContain("color: blue");

	// Initial state: css-style-sheet
	expect(sheetA).toBeInstanceOf(CSSStyleSheet);
	expect(sheetA._cssText).toContain("color: green");
	expect(sheetA._cssText).toContain("font-weight: bold");
	expect(sheetB).toBeInstanceOf(CSSStyleSheet);
	expect(sheetB._cssText).toContain("color: purple");

	// Initial state: style
	const styles = window.document.getElementsByTagName("style");
	const allCSS = Array.from(styles).map(s => s.textContent);
	expect(allCSS.some(c => c.includes("color: orange"))).toBe(true);
	expect(allCSS.some(c => c.includes("font-style: italic"))).toBe(true);
	expect(allCSS.some(c => c.includes("color: brown"))).toBe(true);

	// Initial state: link
	expect(typeof linkAClass).toBe("string");
	expect(linkAClass.length).toBeGreaterThan(0);
	expect(typeof linkBClass).toBe("string");
	expect(linkBClass.length).toBeGreaterThan(0);

	module.hot.accept(
		[
			"./text-a.css",
			"./text-b.css",
			"./sheet-a.css",
			"./sheet-b.css",
			"./style-a.css",
			"./style-b.css",
			"./link-a.module.css",
			"./link-b.module.css"
		],
		() => {
			// After HMR: text
			expect(textA).toContain("font-size: 14px");
			expect(textB).toContain("color: cyan");

			// After HMR: css-style-sheet
			expect(sheetA._cssText).toContain("font-weight: normal");
			expect(sheetB._cssText).toContain("color: violet");
		}
	);

	NEXT(
		require("../../update")(done, true, () => {
			// After HMR: style
			const styles = window.document.getElementsByTagName("style");
			const allCSS = Array.from(styles).map(s => s.textContent);
			expect(allCSS.some(c => c.includes("font-style: oblique"))).toBe(true);
			expect(allCSS.some(c => c.includes("color: tan"))).toBe(true);

			done();
		})
	);
});

module.hot.accept();
