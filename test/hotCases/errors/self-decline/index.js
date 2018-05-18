import a from "./a";

it("should abort when module is declined by itself", (done) => {
	expect(a).toBe(1);
	NEXT(require("../../update")((err) => {
		try {
			expect(/Aborted because of self decline: \.\/a\.js/.test(err.message)).toBe(true);
			expect(/Update propagation: \.\/c\.js -> \.\/b\.js -> \.\/a\.js/.test(err.message)).toBe(true);
			done();
		} catch(e) {
			done(e);
		}
	}));
});
