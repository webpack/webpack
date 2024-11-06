it("should allow to run a WebAssembly module with non-js-compatible imports", function() {
	return import("./wasm.wasm").then(function(wasm) {
		const result = wasm.testV128();
		expect(result).toEqual(42);
	});
});
