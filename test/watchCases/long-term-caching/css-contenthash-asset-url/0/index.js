import "./style.css";

it("should compile fine and emit a CSS chunk and a PNG asset", () => {
	const cssAsset = STATS_JSON.assets.find(a => /\.css$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(cssAsset).toBeDefined();
	expect(pngAsset).toBeDefined();

	STATE.cssName = cssAsset.name;
	STATE.pngName = pngAsset.name;
});
