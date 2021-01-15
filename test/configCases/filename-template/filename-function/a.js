it("should be able to load a chunk", async () => {
	await expect(
		import(/* webpackChunkName: "1" */ "./chunk1")
	).resolves.toMatchObject({ default: 1 });
});
