import "./page.html";

it("should change HTML [contenthash] when HTML source changes", () => {
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
	expect(htmlAsset.name).not.toBe(STATE.htmlName);
	STATE.htmlName = htmlAsset.name;
});

it("should keep the PNG filename stable when only HTML source changes", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).toBe(STATE.pngName);
});
