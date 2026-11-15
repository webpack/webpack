it("should not warn when the chunk name is not in its filename", async () => {
	const { default: value } = await import(
		/* webpackChunkName: "query?raw" */ "./value"
	);
	expect(value).toBe(42);
	expect(__STATS__.warnings).toEqual([]);
});
