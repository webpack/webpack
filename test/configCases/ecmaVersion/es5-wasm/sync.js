it("should load a sync wasm module without leaving es5", function (done) {
	// A sync wasm module still needs an async split point above it.
	import("./sync-user").then(function (module) {
		expect(module.add(1, 2)).toBe(3);
		done();
	}).catch(done);
});
