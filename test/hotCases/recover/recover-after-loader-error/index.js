import a from "./loader!./a";

it("should abort when module is not accepted", (done) => {
	expect(a).toBe(1);
	NEXT(require("../../update")(done, {
		ignoreErrored: true
	}, () => {
		expect(a).toBe(1);
		NEXT(require("../../update")(done, {
			ignoreErrored: true
		}, function() {
			expect(a).toBe(3);
			done();
		}));
	}));
});

if(module.hot) {
	module.hot.accept("./loader!./a");
}
