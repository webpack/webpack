import "./page.html";

it("should emit the HTML module", () => {
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
});
