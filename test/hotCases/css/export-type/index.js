import textStyle from "./text.css";

it("should handle HMR for exportType", async function (done) {
	expect(typeof textStyle).toBe("string");
	expect(textStyle).toContain("color: red");
	expect(textStyle).toContain("text-class");
	expect(textStyle).toContain("imported-class");

	let sheetStyle = await import("./stylesheet.css", { with: { type: "css" }});
	expect(sheetStyle.default).toBeInstanceOf(CSSStyleSheet);
	const rules = Array.from(sheetStyle.default.cssRules);
	const rule = rules.find(r => r.selectorText.includes("sheet-class"));
	expect(rule).toBeDefined();
	expect(rule.style.color).toBe("green");

	module.hot.accept(["./text.css"], () => {
		expect(typeof textStyle).toBe("string");
		expect(textStyle).toContain("imported-class-updated");
	});

	NEXT(require("../../update")(done, true, () => {
		import("./stylesheet.css", { with: { type: "css" }}).then(updatedSheetStyle => {
			expect(updatedSheetStyle.default).toBeInstanceOf(CSSStyleSheet);
			const rules = Array.from(updatedSheetStyle.default.cssRules);
			const importedRule = rules.find(r => r.selectorText.includes("imported-class-updated"));
			expect(importedRule).toBeDefined();
			expect(importedRule.style.color).toBe("purple");
			done();
		});
	}))
});

module.hot.accept();

