import "./style.css";

it("should change CSS [contenthash] when CSS source changes", () => {
	const cssAsset = STATS_JSON.assets.find(a => /\.css$/.test(a.name));
	expect(cssAsset).toBeDefined();
	expect(cssAsset.name).not.toBe(STATE.cssName);
	STATE.cssName = cssAsset.name;
});

it("should keep the PNG filename stable when only CSS source changes", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).toBe(STATE.pngName);
});
