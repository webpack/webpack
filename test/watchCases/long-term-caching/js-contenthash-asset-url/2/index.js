const assetUrl = new URL("./logo.png", import.meta.url);

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change JS [contenthash] when a referenced asset's URL changes", () => {
	const jsAsset = STATS_JSON.assets.find(a => /\.js$/.test(a.name));
	expect(jsAsset).toBeDefined();
	expect(jsAsset.name).not.toBe(STATE.jsName);
});

it("should render the new asset filename inside the emitted JS bundle", () => {
	const jsAsset = STATS_JSON.assets.find(a => /\.js$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	const js = fs.readFileSync(
		path.resolve(__dirname, jsAsset.name),
		"utf-8"
	);
	expect(js).toContain(pngAsset.name);
	expect(js).not.toContain(STATE.pngName);
	expect(assetUrl.pathname).toContain(pngAsset.name);
});
