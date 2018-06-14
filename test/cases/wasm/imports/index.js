it("should allow to run a WebAssembly module with imports", function() {
	return import("./wasm.wat?1").then(function(wasm) {
		const result = wasm.addNumber(3);
		expect(result).toEqual(11);
	});
});
