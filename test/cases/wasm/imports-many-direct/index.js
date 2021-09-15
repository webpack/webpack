it("should allow to run a WebAssembly module with many direct wasm dependencies", function() {
	return import("./wasm.wat").then(function(wasm) {
		const result = wasm.testI64();
		expect(result).toEqual(42);
	});
});
