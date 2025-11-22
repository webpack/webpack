import { greeting } from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should update a simple ES module with HMR", (done) => {
	expect(greeting).toBe("Hello World!");

	NEXT(update(done, true, () => {
		// After HMR update, we need to re-import the module in ESM
		import("./module.js").then(updatedModule => {
			expect(updatedModule.greeting).toBe("Hello HMR!");
			done();
		}).catch(done);
	}));
});

export default "hello world";