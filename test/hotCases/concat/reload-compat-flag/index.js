var x = require("./module");

it("should allow to hot replace modules in a ConcatenatedModule", (done) => {
	expect(x).toEqual({
		default: "ok1",
		[Symbol.toStringTag]: "Module"
	});
	module.hot.accept("./module", () => {
		x = require("./module");
		expect(x).toEqual({
			default: "ok2",
			[Symbol.toStringTag]: "Module"
		});
		done();
	});
	NEXT(require("../../update")(done));
});
