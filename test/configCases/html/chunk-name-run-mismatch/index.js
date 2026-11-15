it("should keep the run a page names in the entry holding the name", () => {
	const pair = __STATS__.entrypoints.pair;
	expect(pair.assets.map((asset) => asset.name)).toEqual(["pair.js"]);
});
