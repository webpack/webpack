import value from "./value";
import { invalidate } from "./self";

import update from "../../update.esm";

import.meta.webpackHot.accept(["./value", "./self"]);

it("should load a chunk while an invalidation waits in ready after an applied update", (done) => {
	expect(value).toBe(1);
	NEXT(
		update(done, true, () => {
			expect(value).toBe(2);
			invalidate();
			expect(import.meta.webpackHot.status()).toBe("ready");
			// A caller may wait for the import before it calls apply().
			import(/* webpackChunkName: "page" */ "./page")
				.then((m) => {
					expect(m.default).toBe("page");
					return import.meta.webpackHot.apply();
				})
				.then(() => {
					expect(import.meta.webpackHot.status()).toBe("idle");
					done();
				})
				.catch(done);
		})
	);
});
