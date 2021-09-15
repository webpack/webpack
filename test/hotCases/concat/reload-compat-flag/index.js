var x = require("./module");

it("should allow to hot replace modules in a ConcatenatedModule", (done) => {
	expect(x).toEqual(nsObj({
		default: "ok1"
	}));
	module.hot.accept("./module", () => {
		x = require("./module");
		expect(x).toEqual(nsObj({
			default: "ok2"
		}));
		done();
	});
	NEXT(require("../../update")(done));
});
