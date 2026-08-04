it("should slice the module hash for a source-phase import", () =>
	import.source("./wasm.wat").then((wasmModule) => {
		expect(wasmModule instanceof WebAssembly.Module).toBe(true);

		return WebAssembly.instantiate(wasmModule).then((instance) => {
			expect(instance.exports.add(10, 32)).toBe(42);
		});
	}));
