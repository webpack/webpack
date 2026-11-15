it("should instantiate a universal WebAssembly module with a hashed filename", async () => {
	const { answer } = await import("./module.wat");
	expect(answer()).toBe(42);
});
