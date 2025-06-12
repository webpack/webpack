it("should handle HMR with async chunks in ESM format", (done) => {
	// Initial load of async chunks
	Promise.all([
		import("./async-module"),
		import("./lazy-module")
	]).then(([asyncModule, lazyModule]) => {
		expect(asyncModule.message).toBe("Hello from async module!");
		expect(lazyModule.data.value).toBe(42);
		
		// Use ESM-style HMR API if available
		const hmr = import.meta.webpackHot || module.hot;
		
		// Accept updates for async modules
		hmr.accept(["./async-module", "./lazy-module"]);
		
		NEXT(require("../../update")(done, true, () => {
			// Re-import after HMR update
			Promise.all([
				import("./async-module"),
				import("./lazy-module")
			]).then(([updatedAsyncModule, updatedLazyModule]) => {
				expect(updatedAsyncModule.message).toBe("Updated async module!");
				expect(updatedLazyModule.data.value).toBe(100);
				done();
			}).catch(done);
		}));
	}).catch(done);
});

it("should support dynamic imports with proper ESM chunk loading", (done) => {
	// Test that dynamic imports work correctly with ESM chunk format
	import("./async-module").then((module) => {
		expect(module.message).toBeDefined();
		expect(typeof module.message).toBe("string");
		done();
	}).catch(done);
});
