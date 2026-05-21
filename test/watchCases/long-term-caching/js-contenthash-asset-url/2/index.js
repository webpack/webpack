const assetUrl = new URL("./logo.png", import.meta.url);
const tag = "step1";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change JS [contenthash] when a referenced asset's URL changes", () => {
	// The rendered JS bundle embeds the asset's hashed filename in the
	// asset module wrapper (`module.exports = __webpack_require__.p +
	// "logo.<hash>.png"`). When the asset bytes change, its [contenthash]
	// filename changes, so the rendered JS bytes also change. The JS
	// chunk's [contenthash] must reflect that — otherwise the JS file is
	// served at a stale URL with fresh contents, breaking long-term
	// caching.
	const jsAsset = STATS_JSON.assets.find(a => /\.js$/.test(a.name));
	expect(jsAsset).toBeDefined();
	expect(jsAsset.name).not.toBe(STATE.jsName);
});

it("should render the new asset filename inside the emitted JS bundle", () => {
	// Sanity check: the rendered JS bytes must reference the asset
	// filename that actually exists on disk. A persisted code-generation
	// `data.url` entry from the previous build must not shadow the
	// freshly computed URL.
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
