import update from "../../update.esm";
import store from "./store";
import "./holder";

import.meta.webpackHot.accept("./holder");

it("should keep updating a cached module that became async-only in a chunk shared with another runtime", (done) => {
	expect(store.value).toBe(1);
	NEXT(
		update(done, true, () => {
			expect(store.value).toBe(1);
			NEXT(
				update(done, true, () => {
					expect(store.value).toBe(3);
					done();
				})
			);
		})
	);
});
