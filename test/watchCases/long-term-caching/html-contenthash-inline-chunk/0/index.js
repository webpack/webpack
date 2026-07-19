import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const pageHtml = () =>
	STATS_JSON.assets.find((a) => /^page\..*\.html$/.test(a.name));

it("should inline the page's script chunk directly into the extracted HTML", () => {
	const asset = pageHtml();
	expect(asset).toBeDefined();
	const content = fs.readFileSync(path.resolve(__dirname, asset.name), "utf-8");
	// The chunk's bytes (incl. the dep value) are embedded, leaving no external
	// `<script src>` pointing at the inlined entry chunk.
	expect(content).toContain("inline_marker_v1");
	expect(content).not.toMatch(/<script[^>]*\bsrc=/);
	STATE.htmlName = asset.name;
});
