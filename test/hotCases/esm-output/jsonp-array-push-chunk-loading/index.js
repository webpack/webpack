import { greeting } from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should apply an HMR update with jsonp/array-push ES module output", (done) => {
	expect(greeting).toBe("Hello World!");

	NEXT(
		update(done, true, () => {
			import("./module.js")
				.then((updatedModule) => {
					expect(updatedModule.greeting).toBe("Hello HMR!");
					done();
				})
				.catch(done);
		})
	);
});
