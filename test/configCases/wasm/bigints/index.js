it("should allow converting i64s to JS bigints", async () => {
	const { getI64 } = await import("./wasm.wat");
	expect(getI64()).toEqual(42n);
});

it("should allow converting JS bigints to i64s", async () => {
	const { takeI64 } = await import("./wasm.wat");
	takeI64(42n);
})
