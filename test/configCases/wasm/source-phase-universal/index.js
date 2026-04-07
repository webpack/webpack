it("should allow to run a WebAssembly module (indirect)", function() {
	return import("./module").then(function(module) {
		const result = module.run();
		expect(result).toEqual(42);
	});
});

it("should allow to run a WebAssembly module (direct)", function() {
	return import.source("./wasm.wat?2").then(function(wasmModule) {
		const { add, getNumber } = new WebAssembly.Instance(wasmModule).exports;
		const result = add(getNumber(), 2);

		expect(result).toEqual(42);
	});
});

it("should allow to run a WebAssembly module using comment (direct)", function() {
	return import(/* webpackSource: true */ "./wasm.wat?3")
		.then(wasmModule => WebAssembly.instantiate(wasmModule))
		.then(({ exports }) => {

			const result = exports.add(exports.getNumber(), 2);
			expect(result).toEqual(42);
		});
});

it("should allow to run the same WebAssembly module with source", function() {
	return import.source("./wasm.wat?4").then(function(wasmModule) {
		const { add, getNumber } = new WebAssembly.Instance(wasmModule).exports;
		const result = add(getNumber(), 2);

		expect(result).toEqual(42);
	});
});

it("should allow to run the same WebAssembly module without source phase", function() {
	return import("./wasm.wat?4").then(function (wasmModule) {
		const result = wasmModule.add(wasmModule.getNumber(), 2);
		expect(result).toEqual(42);
	});
});
