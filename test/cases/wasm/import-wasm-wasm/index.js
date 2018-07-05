it("should allow to run a WebAssembly module with imports", function() {
	return import("./wasm.wat").then(function(wasm) {
		const result = wasm.addNumber(20);
		expect(result).toEqual(42);
	});
});
