var value = require("./parent-file");

it("should bubble update from a nested dependency", (done) => {
	expect(value).toBe(1);
	module.hot.accept("./parent-file", () => {
		value = require("./parent-file");
		expect(value).toBe(2);
		done();
	});
	NEXT(require("../../update")(done));
});
