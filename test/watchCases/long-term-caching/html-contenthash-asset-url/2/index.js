import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change HTML [contenthash] when a referenced asset's URL changes", () => {
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
	expect(htmlAsset.name).not.toBe(STATE.htmlName);
});

it("should render the new asset filename inside the emitted HTML file", () => {
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).toContain(pngAsset.name);
	expect(html).not.toContain(STATE.pngName);
});
