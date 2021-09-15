import value1 from "./a";

it("should have the expected static path defined", function () {
	expect(DEFINE_PATH).toBe("./a");
});

it("should hot.accept the module located at the static file path without breaking the compiler", function () {
	module.hot.accept("./a");
	expect(value1).toBe(1);
});

it("should hot.accept the module located at the defined file path without breaking the compiler, when one argument is passed to hot.accept", function () {
	module.hot.accept(DEFINE_PATH);
});

it("should hot.accept the module located at the defined file path without breaking the compiler, when multiple arguments are passed to hot.accept", function (done) {
	module.hot.accept(DEFINE_PATH, () => {
		expect(DEFINE_PATH).toBe("./a");
		done();
	});
	NEXT(require("../../update")(done));
});
