it("should support wasm compiled from c++", function() {
	return import("./memory3.wasm").then(function(wasm) {
		expect(wasm._Z3getv()).toBe(0);
		wasm._Z3seti(42);
		expect(wasm._Z3getv()).toBe(42);
	});
});

it("should raw memory export without data", function() {
	return import("./memory2.wasm").then(function(wasm) {
		expect(wasm.memory).toBeInstanceOf(WebAssembly.Memory);
		expect(wasm.memory.buffer).toBeInstanceOf(ArrayBuffer);
		expect(wasm.memory.buffer.byteLength).toBe(1 << 16);
	});
});
