var value = require("./parent-file");

it("should update multiple modules at the same time", (done) => {
	expect(value).toBe(2);
	module.hot.accept("./parent-file", () => {
		value = require("./parent-file");
		expect(value).toBe(4);
		done();
	});
	NEXT(require("../../update")(done));
});
