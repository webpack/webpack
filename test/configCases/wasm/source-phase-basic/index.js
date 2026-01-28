it("should import source and return WebAssembly.Module", function () {
	import("./module.js").then(function ({ wasmModule }) {
		expect(wasmModule instanceof WebAssembly.Module).toBe(true);

		return WebAssembly.instantiate(wasmModule).then(function (instance) {
			expect(instance.exports.add(10, 32)).toEqual(42);
		});
	});
});

it("should dynamically import source and return WebAssembly.Module", function () {
	return import.source("./wasm.wat").then(function (wasmModule) {
		expect(wasmModule instanceof WebAssembly.Module).toBe(true);

		return WebAssembly.instantiate(wasmModule).then(function (instance) {
			expect(instance.exports.add(10, 32)).toEqual(42);
		});
	});
});

it("should import source multiple times and return same module", function () {
	return Promise.all([
		import.source("./wasm.wat"),
		import.source("./wasm.wat"),
		import("./module.js"),
	]).then(function ([module1, module2, { wasmModule: module3 }]) {
		expect(module1 instanceof WebAssembly.Module).toBe(true);
		expect(module2 instanceof WebAssembly.Module).toBe(true);
		expect(module3 instanceof WebAssembly.Module).toBe(true);
		// all should be the same Module instance
		expect(module1).toBe(module2);
		expect(module1).toBe(module3);
	});
});
