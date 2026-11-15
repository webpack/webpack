it("should load chunks whose names hold '?' through filename-safe ids", async () => {
	expect(
		(await import(/* webpackChunkName: "query?raw" */ "./a")).default
	).toBe(1);
	expect(
		(await import(/* webpackChunkName: "query_raw" */ "./b")).default
	).toBe(2);
	const chunks = __STATS__.chunks.filter((chunk) => chunk.names.length > 0);
	const ids = chunks.map((chunk) => chunk.id).sort();
	expect(ids).toEqual(["main", "query_raw", "query_raw0"]);
});
