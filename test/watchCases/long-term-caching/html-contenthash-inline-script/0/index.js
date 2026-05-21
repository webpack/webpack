import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const findInlineEntry = (assets) =>
	assets.find((a) => /^__html_/.test(a.name) && /\.js$/.test(a.name));

it("should compile fine and emit the extracted HTML and the inline-script entry chunk", () => {
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	const inlineEntry = findInlineEntry(STATS_JSON.assets);
	expect(htmlAsset).toBeDefined();
	expect(inlineEntry).toBeDefined();

	STATE.htmlName = htmlAsset.name;
	STATE.inlineEntryName = inlineEntry.name;
});

it("should resolve every chunk-URL sentinel — no `__WEBPACK_HTML_CHUNK_URL__` survives into the emitted HTML", () => {
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).not.toContain("__WEBPACK_HTML_CHUNK_URL__");
});

it("should render the inline-script entry chunk's hashed filename inside the emitted HTML", () => {
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	const inlineEntry = findInlineEntry(STATS_JSON.assets);
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).toContain(inlineEntry.name);
});
