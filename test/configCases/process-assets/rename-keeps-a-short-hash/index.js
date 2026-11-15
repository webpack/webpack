it("should keep a hash too short to recompute in the asset's info", () => {
	const asset = __STATS__.assets.find((asset) => asset.name.endsWith(".txt"));
	expect(asset.name).toBe(["abc", "zyxwvuts"].join("-") + ".txt");
	expect(asset.info.contenthash).toEqual(["abc", ["zyxw", "vuts"].join("")]);
});
