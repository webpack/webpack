const assetUrl = new URL("./logo.png", import.meta.url);
const tag = "step1";

it("should change JS [contenthash] when JS source changes", () => {
	const jsAsset = STATS_JSON.assets.find(a => /\.js$/.test(a.name));
	expect(jsAsset).toBeDefined();
	expect(jsAsset.name).not.toBe(STATE.jsName);
	expect(tag).toBe("step1");
	expect(assetUrl).toBeDefined();
	STATE.jsName = jsAsset.name;
});

it("should keep the PNG filename stable when only JS source changes", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).toBe(STATE.pngName);
});
