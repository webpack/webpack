import a from "./a";
import b from "./b";

it("should abort when module is not accepted", (done) => {
	expect(a).toBe(2);
	expect(b).toBe(1);
	NEXT(require("../../update")((err) => {
		try {
			expect(err.message).toMatch(/Aborted because \.\/c\.js is not accepted/);
			expect(err.message).toMatch(/Update propagation: \.\/c\.js -> \.\/b\.js -> \.\/index\.js/);
			done();
		} catch(e) { done(e); }
	}));
});
