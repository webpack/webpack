import url from "../_images/file.png";

it("should import asset with module.generator.asset.publicPath", () => {
	expect(url).toMatch(/^[a-f0-9]{20}\/assets\/[a-f0-9]{10}\.file\.png$/);
	const assetInfo = __STATS__.assets.find(
		a => a.info.sourceFilename === "../_images/file.png"
	).info;
	expect(assetInfo.immutable).toBe(true);
	expect(assetInfo.contenthash.length).toBe(2);
	expect(assetInfo.contenthash[0].length).toBe(10);
	expect(assetInfo.contenthash[1].length).toBe(20);
});
