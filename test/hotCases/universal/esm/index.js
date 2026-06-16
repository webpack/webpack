import { greeting } from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should update an ES module with HMR in a universal target", (done) => {
	expect(greeting).toBe("Hello World!");

	NEXT(
		update(done, true, () => {
			import("./module.js")
				.then((updated) => {
					expect(updated.greeting).toBe("Hello HMR!");
					done();
				})
				.catch(done);
		})
	);
});
