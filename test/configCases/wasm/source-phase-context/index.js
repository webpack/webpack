it("should resolve a computed source phase import to the WebAssembly.Module", async () => {
	const name = "add";
	const wasmModule = await import.source(`./${name}.wat`);

	expect(wasmModule instanceof WebAssembly.Module).toBe(true);

	const instance = await WebAssembly.instantiate(wasmModule);

	expect(instance.exports.add(10, 32)).toBe(42);
});

it("should keep every member of the context reachable", async () => {
	const name = "sub";
	const wasmModule = await import.source(`./${name}.wat`);
	const instance = await WebAssembly.instantiate(wasmModule);

	expect(instance.exports.sub(44, 2)).toBe(42);
});
