import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const jsAsset = new URL("js-asset", import.meta.url);
const jsAssetUrl = new URL("js-asset-url", import.meta.url);
const jsCssUrl = new URL("js-css-url", import.meta.url);

it("should resolve an asset external from javascript, whichever type it is", () => {
	expect(jsAsset.toString()).toBe("https://example.test/js-asset.png");
	expect(jsAssetUrl.toString()).toBe("https://example.test/js-asset-url.png");
	expect(jsCssUrl.toString()).toBe("https://example.test/js-css-url.png");
});

it("should keep an asset external in the stylesheet, whichever type it is", () => {
	// a web target has no `__dirname`, so take the directory from the stats
	const css = fs.readFileSync(
		path.join(__STATS__.outputPath, `bundle${__STATS_I__}.css`),
		"utf-8"
	);

	expect(css).toContain("url(https://example.test/css-asset.png)");
	expect(css).toContain("url(https://example.test/css-asset-url.png)");
	expect(css).toContain("url(https://example.test/css-css-url.png)");
});
