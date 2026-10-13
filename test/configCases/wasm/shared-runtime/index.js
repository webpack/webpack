it("should instantiate async wasm in a chunk that is initial for another entry", async () => {
	expect((await import("./feature.js")).value).toBe(43);
	expect((await import("./feature.js")).value).toBe(43);
});
