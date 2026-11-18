import sheet from "./style.css" with { type: "css" };

const color = () =>
	Array.from(sheet.cssRules).find((rule) => rule.selectorText === ".box").style
		.color;

it("should accept a CSS module script by its import attributes", (done) => {
	expect(sheet).toBeInstanceOf(CSSStyleSheet);
	expect(color()).toBe("red");
	module.hot.accept("./style.css", { with: { type: "css" } }, () => {
		expect(color()).toBe("green");
		done();
	});
	NEXT(require("../../update")(done));
});
