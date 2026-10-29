import "./style.css";

const cssText = () =>
	Array.from(window.document.getElementsByTagName("style"), (style) =>
		style.textContent
	).join("\n");

it("should keep injected styles that moved into a new initial chunk", (done) => {
	expect(cssText()).toContain("color: red;");
	NEXT(
		require("../../update")(done, true, () => {
			expect(cssText()).toContain("color: blue;");
			expect(cssText()).not.toContain("color: red;");
			done();
		})
	);
});

module.hot.accept();
