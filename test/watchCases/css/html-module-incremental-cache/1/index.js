import "./page.html";

const marker = "changed";

it("should keep the HTML module available after an incremental rebuild", () => {
	expect(marker).toBe("changed");
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
});
