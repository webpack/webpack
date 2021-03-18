it("should work", async () => {
	const module = await import(/* webpackChunkName: "the-chunk" */ "./chunk");
	expect(module.default).toBe("ok");
});
