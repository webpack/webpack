it("should load chunks whose names hold '?' or '#' and warn for each", async () => {
	expect(
		(await import(/* webpackChunkName: "query?raw" */ "./value?query")).default
	).toBe(42);
	expect(
		(await import(/* webpackChunkName: "fragment#raw" */ "./value#fragment"))
			.default
	).toBe(42);
	expect(
		__STATS__.children[__STATS_I__].warnings.map(warning => warning.chunkName).sort()
	).toEqual(["fragment#raw", "query?raw"]);
});

it("should load an unnamed chunk without warning", async () => {
	expect((await import("./value")).default).toBe(42);
});
