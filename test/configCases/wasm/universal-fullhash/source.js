it("should compile a universal WebAssembly module with a hashed filename", async () => {
	const module = await import.source("./module.wat");
	const { exports } = new WebAssembly.Instance(module);
	expect(exports.answer()).toBe(42);
});
