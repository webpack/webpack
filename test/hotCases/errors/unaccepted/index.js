import a from "./a";
import b from "./b";

it("should abort when module is not accepted", (done) => {
	expect(a).toBe(2);
	expect(b).toBe(1);
	NEXT(require("../../update")((err) => {
		try {
			expect(/Aborted because \.\/c\.js is not accepted/.test(err.message)).toBe(true);
			expect(/Update propagation: \.\/c\.js -> \.\/b\.js -> \.\/index\.js/.test(err.message)).toBe(true);
			done();
		} catch(e) { done(e); }
	}));
});
