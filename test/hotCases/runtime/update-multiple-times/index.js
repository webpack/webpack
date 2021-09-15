var value = require("./file");

it("should accept a dependencies multiple times", (done) => {
	expect(value).toBe(1);
	module.hot.accept("./file", () => {
		var oldValue = value;
		value = require("./file");
		expect(value).toBe(oldValue + 1);
		if(value < 4)
			NEXT(require("../../update")(done));
		else
			done();
	});
	NEXT(require("../../update")(done));
});
