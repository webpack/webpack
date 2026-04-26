import { textA, textB, sheetA, sheetB, linkAClass, linkBClass } from "./lib.js";

it("should handle HMR for all exportTypes with concatenation", function (done) {
	// Verify modules are concatenated: only index.js and lib.js (+ update helper)
	// should exist as separate modules, all CSS modules should be inlined into lib.js
	const moduleIds = Object.keys(__webpack_require__.m);
	const appModules = moduleIds.filter(id => !id.includes("update"));
	expect(appModules.length).toBe(2);

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

	// Initial state: link
	expect(typeof linkAClass).toBe("string");
	expect(linkAClass.length).toBeGreaterThan(0);
	expect(typeof linkBClass).toBe("string");
	expect(linkBClass.length).toBeGreaterThan(0);

	module.hot.accept(
		["./lib.js"],
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
			done();
		})
	);
});

module.hot.accept();
