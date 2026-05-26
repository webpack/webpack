const assetUrl = new URL("./logo.png", import.meta.url);

it("should compile fine and emit a JS chunk and a PNG asset", () => {
	const jsAsset = STATS_JSON.assets.find(a => /\.js$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(jsAsset).toBeDefined();
	expect(pngAsset).toBeDefined();
	expect(assetUrl.pathname).toContain(pngAsset.name);

	STATE.jsName = jsAsset.name;
	STATE.pngName = pngAsset.name;
});
