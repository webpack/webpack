import defer * as deferred from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should update a deferred import in a universal target", (done) => {
	// first access evaluates the deferred namespace
	expect(deferred.value).toBe("defer-1");

	NEXT(
		update(done, true, () => {
			import("./module.js")
				.then((updated) => {
					expect(updated.value).toBe("defer-2");
					done();
				})
				.catch(done);
		})
	);
});
