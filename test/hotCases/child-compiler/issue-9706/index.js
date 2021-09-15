import value, { assets } from "./report-child-assets-loader!./file";

it("should not emit hot updates from child compilers", done => {
	expect(value).toBe(1);
	expect(assets).toEqual(["test.js"]);
	module.hot.accept("./report-child-assets-loader!./file", () => {
		expect(value).toBe(2);
		expect(assets).toEqual(["test.js"]);
		done();
	});
	NEXT(require("../../update")(done));
});
