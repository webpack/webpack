import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change HTML [contenthash] when a referenced asset's URL changes", () => {
	// The extracted HTML embeds the asset's filename inside `<img src>`.
	// When the asset bytes change, its [contenthash] filename changes, so
	// the rendered HTML bytes also change. The HTML's [contenthash] must
	// reflect that — otherwise the HTML file is served at a stale URL with
	// fresh contents, breaking long-term caching.
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
	expect(htmlAsset.name).not.toBe(STATE.htmlName);
});

it("should render the new asset filename inside the emitted HTML file", () => {
	// Sanity check: the rendered HTML bytes must reference the asset
	// filename that actually exists on disk. A persisted code-generation
	// `data.url` entry from the previous build must not shadow the
	// freshly computed URL.
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).toContain(pngAsset.name);
	expect(html).not.toContain(STATE.pngName);
});
