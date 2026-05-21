import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change PNG asset filename when its bytes change", () => {
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	expect(pngAsset).toBeDefined();
	expect(pngAsset.name).not.toBe(STATE.pngName);
});

it("should change HTML [contenthash] when an asset referenced from inline <style> changes", () => {
	// The rendered HTML embeds the CSS `<style>` body verbatim, with
	// `url(...)` rewritten to the asset's hashed filename. When the asset
	// bytes change, its [contenthash] filename changes, so the rendered
	// HTML bytes also change. The HTML's [contenthash] must reflect that
	// — otherwise the HTML is served at a stale URL with fresh contents.
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	expect(htmlAsset).toBeDefined();
	expect(htmlAsset.name).not.toBe(STATE.htmlName);
});

it("should render the new asset filename inside the emitted HTML's <style>", () => {
	const htmlAsset = STATS_JSON.assets.find(a => /\.html$/.test(a.name));
	const pngAsset = STATS_JSON.assets.find(a => /\.png$/.test(a.name));
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).toContain(pngAsset.name);
	expect(html).not.toContain(STATE.pngName);
});
