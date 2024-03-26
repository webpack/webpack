import url from "../_images/file.png";
import url2 from "../_images/file_copy.png";

it("should import asset with module.generator.asset.allowNumericOnlyHash", () => {
	expect(url).toMatch(/images\/file\.[a-f0-9]{6}\.png$/);
	expect(url2).toMatch(/images\/file_copy\.[a-f0-9]{6}\.png$/);
	const assetInfo1 = __STATS__.assets.find(
		a => a.info.sourceFilename === "../_images/file.png"
	).info;
	const assetInfo2 = __STATS__.assets.find(
		a => a.info.sourceFilename === "../_images/file_copy.png"
	).info;

	expect(assetInfo1.contenthash.length).toBe(2);
	expect(assetInfo1.contenthash[0].length).toBe(6);
	expect(assetInfo1.contenthash[1].length).toBe(6);
	expect(assetInfo2.contenthash.length).toBe(2);
	expect(assetInfo2.contenthash[0].length).toBe(6);
	expect(assetInfo2.contenthash[1].length).toBe(6);

	expect(assetInfo1.fullhash).toBe(assetInfo2.fullhash);
	expect(assetInfo1.contenthash[0]).not.toEqual(assetInfo2.contenthash[0]);
	expect(assetInfo1.contenthash[0].slice(1)).toEqual(assetInfo2.contenthash[0].slice(1));
});
