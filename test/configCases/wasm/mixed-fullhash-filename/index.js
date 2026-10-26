it("should instantiate a WebAssembly module whose name mixes runtime and inlined hashes", async () => {
	const { answer } = await import("./module.wat");
	expect(answer()).toBe(42);
});
