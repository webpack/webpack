it("should be able load the chunk", async () => {
	const module = await import(/* webpackChunkName: "the-chunk" */ "./chunk");
	expect(module.default).toBe("ok");
});
