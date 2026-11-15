it("should let two pages share a named run of two scripts", () => {
	expect(__STATS__.errors).toEqual([]);
	const pair = __STATS__.entrypoints.pair;
	expect(pair.assets.map((asset) => asset.name)).toEqual(["pair.js"]);
});
