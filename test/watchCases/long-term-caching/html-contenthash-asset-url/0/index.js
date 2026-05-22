import "./page.html";

it("should compile fine and emit an HTML file and a PNG asset", () => {
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(htmlAsset).toBeDefined();
	expect(pngAsset).toBeDefined();

	STATE.htmlName = htmlAsset.name;
	STATE.pngName = pngAsset.name;
});
