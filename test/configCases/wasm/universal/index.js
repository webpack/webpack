it("should allow to run a WebAssembly module (indirect)", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(42);
	});
});

it("should allow to run a WebAssembly module (direct)", function() {
	return import("./wasm.wat?2").then(function(wasm) {
		const result = wasm.add(wasm.getNumber(), 2);
		expect(result).toEqual(42);
	});
});
