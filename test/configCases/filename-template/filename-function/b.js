it("should be able to load a chunk", async () => {
	await expect(
		import(/* webpackChunkName: "2" */ "./chunk2")
	).resolves.toMatchObject({ default: 2 });
});
