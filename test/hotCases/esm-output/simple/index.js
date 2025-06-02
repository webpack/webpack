import { greeting } from "./module.js";

it("should update a simple ES module with HMR", (done) => {
	expect(greeting).toBe("Hello World!");

	if (import.meta.webpackHot) {
		import.meta.webpackHot.accept("./module.js");
	} else if (module.hot) {
		// Fallback for current implementation
		module.hot.accept("./module.js");
	}

	NEXT(require("../../update")(done, true, () => {
		// After HMR update, we need to re-import the module in ESM
		import("./module.js").then(updatedModule => {
			expect(updatedModule.greeting).toBe("Hello HMR!");
			done();
		}).catch(done);
	}));
});

it("should have HMR runtime available in ESM output", () => {
	// Check both APIs
	const hasHMR = typeof import.meta.webpackHot === "object" || typeof module.hot === "object";
	expect(hasHMR).toBe(true);

	// Verify API functions
	const hmr = import.meta.webpackHot || module.hot;
	expect(typeof hmr.accept).toBe("function");
	expect(typeof hmr.decline).toBe("function");
	expect(typeof hmr.dispose).toBe("function");
});
