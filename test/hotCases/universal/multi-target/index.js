import { value } from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should update across web, node and webworker targets", (done) => {
	expect(value).toBe("multi-1");

	NEXT(
		update(done, true, () => {
			import("./module.js")
				.then((updated) => {
					expect(updated.value).toBe("multi-2");
					done();
				})
				.catch(done);
		})
	);
});
