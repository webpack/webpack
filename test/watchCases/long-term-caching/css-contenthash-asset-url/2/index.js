import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change CSS [contenthash] when a referenced asset's URL changes", () => {
	// The rendered CSS chunk contains the asset's filename inside `url(...)`.
	// When the asset bytes change, its [contenthash] filename changes, so the
	// rendered CSS bytes also change. The CSS chunk's [contenthash] must
	// reflect that — otherwise the CSS file is served at a stale URL with
	// fresh contents, breaking long-term caching.
	const cssAsset = STATS_JSON.assets.find(a => /\.css$/.test(a.name));
	expect(cssAsset).toBeDefined();
	expect(cssAsset.name).not.toBe(STATE.cssName);
});

it("should render the new asset URL inside the emitted CSS file", () => {
	// Sanity check: the rendered CSS bytes must reference the asset filename
	// that actually exists on disk. A persisted code-generation `data.url`
	// entry from the previous build must not shadow the freshly computed URL.
	const cssAsset = STATS_JSON.assets.find(a => /\.css$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	const css = fs.readFileSync(
		path.resolve(__dirname, cssAsset.name),
		"utf-8"
	);
	expect(css).toContain(pngAsset.name);
	expect(css).not.toContain(STATE.pngName);
});
