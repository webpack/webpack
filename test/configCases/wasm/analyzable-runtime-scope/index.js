it("should load wasm from a runtime the public-path override does not reach", async () => {
	const { run } = await import("./module");

	expect(run()).toBe(84);
});
