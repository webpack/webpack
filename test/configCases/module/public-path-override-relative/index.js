it("should load a chunk relative to the bundle when the public path may be reassigned", async () => {
	if (Math.random() < 0) __webpack_public_path__ = "https://example.com/";
	const module = await import(/* webpackChunkName: "chunk" */ "./chunk");
	expect(module.default).toBe(42);
});
