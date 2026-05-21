import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const findInlineEntry = (assets) =>
	assets.find(
		(a) =>
			/^__html_/.test(a.name) &&
			/\.js$/.test(a.name) &&
			a.name !== STATE.inlineEntryName
	);

it("should change the inline-script entry chunk filename when its dep changes", () => {
	const inlineEntry = findInlineEntry(STATS_JSON.assets);
	expect(inlineEntry).toBeDefined();
	expect(inlineEntry.name).not.toBe(STATE.inlineEntryName);
});

it("should change HTML [contenthash] when the inline script's dep changes", () => {
	// The rendered HTML embeds the inline-script entry chunk's filename
	// inside the rewritten `<script src>` attribute. When the chunk's
	// [contenthash] changes (because the imported module's bytes
	// changed), the rendered HTML bytes change. The HTML's
	// [contenthash] must reflect that — otherwise the HTML is served at
	// a stale URL while embedding a fresh chunk filename.
	const htmlAsset = STATS_JSON.assets.find(
		(a) => /\.html$/.test(a.name) && a.name !== STATE.htmlName
	);
	expect(htmlAsset).toBeDefined();
});

it("should render the new entry chunk filename inside the emitted HTML's <script src>", () => {
	const inlineEntry = findInlineEntry(STATS_JSON.assets);
	const htmlAsset = STATS_JSON.assets.find(
		(a) => /\.html$/.test(a.name) && a.name !== STATE.htmlName
	);
	const html = fs.readFileSync(
		path.resolve(__dirname, htmlAsset.name),
		"utf-8"
	);
	expect(html).toContain(inlineEntry.name);
	expect(html).not.toContain(STATE.inlineEntryName);
});
