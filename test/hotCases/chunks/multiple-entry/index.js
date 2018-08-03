import value1 from "./file";

it("should import a changed chunk (multiple entry)", (done) => {
	expect(value1).toBe(1);
	module.hot.accept("./file", function() {
		expect(value1).toBe(2);
		done();
	});
	NEXT(require("../../update")(done));
});
