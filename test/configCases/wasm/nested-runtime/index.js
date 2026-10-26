it("should load WebAssembly relative to the runtime directory", async () => {
	const { answer } = await import(/* webpackMode: "eager" */ "./wasm.wat");
	expect(answer()).toBe(42);
});

it("should compile WebAssembly relative to the runtime directory", async () => {
	const module = await import(
		/* webpackSource: true, webpackMode: "eager" */ "./wasm.wat"
	);
	const { exports } = new WebAssembly.Instance(module);
	expect(exports.answer()).toBe(42);
});
