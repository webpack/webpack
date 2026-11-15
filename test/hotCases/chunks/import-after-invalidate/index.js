import value from "./value";
import { invalidate } from "./self";

const update = require("../../update");

module.hot.accept(["./value", "./self"]);

it("should load a chunk while an invalidation waits in ready after an applied update", (done) => {
	expect(value).toBe(1);
	NEXT(
		update(done, true, () => {
			expect(value).toBe(2);
			invalidate();
			expect(module.hot.status()).toBe("ready");
			// A caller may wait for the import before it calls apply().
			import(/* webpackChunkName: "page" */ "./page")
				.then((m) => {
					expect(m.default).toBe("page");
					return module.hot.apply();
				})
				.then(() => {
					expect(module.hot.status()).toBe("idle");
					done();
				})
				.catch(done);
		})
	);
});
