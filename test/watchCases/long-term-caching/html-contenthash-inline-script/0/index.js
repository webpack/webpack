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

// Full sentinel form — the bare marker would match this file's own source.
const SENTINEL_RE = /WEBPACK_HTML_CHUNK_URL__[0-9a-f]+__[a-z]+__END__/;

it("should resolve every chunk-URL sentinel in the emitted HTML", () => {
	const htmlAsset = STATS_JSON.assets.find((a) => /\.html$/.test(a.name));
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).not.toMatch(SENTINEL_RE);
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

it("should resolve every chunk-URL sentinel in the JS bundle's HTML export too", () => {
	const jsAsset = STATS_JSON.assets.find((a) => /^main\..*\.js$/.test(a.name));
	const inlineEntry = findInlineEntry(STATS_JSON.assets);
	const js = fs.readFileSync(path.resolve(__dirname, jsAsset.name), "utf-8");
	expect(js).not.toMatch(SENTINEL_RE);
	expect(js).toContain(inlineEntry.name);
});
