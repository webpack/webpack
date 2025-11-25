import { greeting } from "./module.js";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./module.js"]);

it("should update a simple ES module with HMR using universal target", (done) => {
	expect(greeting).toBe("Hello World!");

	let resolved;
	const promise = import("./dynamic-module").then(r => (resolved = r));
	expect(resolved).toBe(undefined);

	setTimeout(() => {
		NEXT(update(done, true, () => {
			// After HMR update, we need to re-import the module in ESM
			import("./module.js").then(updatedModule => {
				expect(updatedModule.greeting).toBe("Hello HMR!");
				promise.then((updatedModule) => {
					expect(updatedModule.greeting).toBe("Dynamic Hello HMR!");
					done();
				}).catch(done);
			}).catch(done);
		}))
	}, 1000);
});
