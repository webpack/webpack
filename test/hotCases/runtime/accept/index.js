var value = require("./file");

it("should accept a dependencies and require a new value", (done) => {
	expect(value).toBe(1);
	module.hot.accept("./file", () => {
		value = require("./file");
		expect(value).toBe(2);
		outside();
		done();
	});
	NEXT(require("../../update")(done));
});

function outside() {
	expect(value).toBe(2);
}
