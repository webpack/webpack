var valueA = require("./fileA");
var valueB = require("./fileB");

it("should allow updating multiple entries with their own runtime", (done) => {
	expect(valueA).toBe(1);
	expect(valueB).toBe(3);

	module.hot.accept("./fileA", () => {
		valueA = require("./fileA");
		expect(valueA).toBe(2);
	});

	module.hot.accept("./fileB", () => {
		valueB = require("./fileB");
		expect(valueB).toBe(5);
	});

	NEXT(require("../../update")(done));

	done();
});
