it("should load an async wasm module without leaving es5", function (done) {
	import("./add.wat").then(function (module) {
		expect(module.add(1, 2)).toBe(3);
		done();
	}, done);
});
