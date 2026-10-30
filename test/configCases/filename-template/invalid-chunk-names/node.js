it("should preserve invalid names and warn for each chunk", () => {
	const imports = [
		() => import(/* webpackChunkName: "query?raw" */ "./value?query"),
		() => import(/* webpackChunkName: "fragment#raw" */ "./value#fragment")
	];
	expect(imports).toHaveLength(2);
	expect(
		__STATS__.children[__STATS_I__].warnings.map(warning => warning.chunkName).sort()
	).toEqual(["fragment#raw", "query?raw"]);
});

it("should load an unnamed chunk without warning", async () => {
	expect((await import("./value")).default).toBe(42);
});
