import sheet from "./style.css";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./style.css"]);

it("should update CSS exportType 'css-style-sheet' in a universal target", (done) => {
	if (typeof CSSStyleSheet !== "undefined") {
		expect(sheet).toBeInstanceOf(CSSStyleSheet);
		const rule = Array.from(sheet.cssRules).find((r) =>
			r.selectorText.includes("sheet-class")
		);
		expect(rule.style.color).toBe("red");
	} else {
		// node has no CSSStyleSheet: the universal fallback yields the CSS text
		expect(typeof sheet).toBe("string");
		expect(sheet).toContain("color: red");
	}

	NEXT(
		update(done, true, () => {
			import("./style.css")
				.then((updated) => {
					const next = updated.default;
					if (typeof CSSStyleSheet !== "undefined") {
						const rule = Array.from(next.cssRules).find((r) =>
							r.selectorText.includes("sheet-class")
						);
						expect(rule.style.color).toBe("green");
					} else {
						expect(next).toContain("color: green");
					}
					done();
				})
				.catch(done);
		})
	);
});
