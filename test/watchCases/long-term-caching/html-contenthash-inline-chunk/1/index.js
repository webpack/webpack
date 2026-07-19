import "./page.html";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should change the page's [contenthash] when the inlined chunk's content changes", () => {
	// Once inlined, the chunk-URL sentinel that normally busts the page hash is
	// gone; a fresh hashed page filename proves the embedded chunk hash still
	// propagates the content change into the page's `[contenthash]`.
	const asset = STATS_JSON.assets.find(
		(a) => /^page\..*\.html$/.test(a.name) && a.name !== STATE.htmlName
	);
	expect(asset).toBeDefined();
	const content = fs.readFileSync(path.resolve(__dirname, asset.name), "utf-8");
	expect(content).toContain("inline_marker_v2");
	expect(content).not.toContain("inline_marker_v1");
});
