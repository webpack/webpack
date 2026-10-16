import { count, increment } from "./store.js";
import update from "../../update.esm.js";

export { count, increment };

import.meta.webpackHot.accept(["./store.js"]);

it("should keep a library export assignable after its module is replaced", (done) => {
	expect(increment()).toBe(0);
	expect(count).toBe(1);
	NEXT(
		update(done, true, () => {
			import("./store.js")
				.then((store) => {
					expect(store.increment()).toBe(10);
					expect(store.count).toBe(11);
					done();
				})
				.catch(done);
		})
	);
});
