it("should compile a WebAssembly module whose name mixes runtime and inlined hashes", async () => {
	const module = await import.source("./module.wat");
	const { exports } = new WebAssembly.Instance(module);
	expect(exports.answer()).toBe(42);
});
