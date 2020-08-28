it("should allow to load a shared chunk in a WebWorker", async () => {
	expect(await import(/* webpackChunkName: "chunk" */ "./chunk")).toEqual(
		nsObj({
			default: 42
		})
	);
});
