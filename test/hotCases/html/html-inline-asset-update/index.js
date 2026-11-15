const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// The page's inline scripts: the text between each `<script>` and its end tag.
const inlineScripts = () => {
	const page = fs.readFileSync(path.join(__dirname, "page.html"), "utf-8");
	const scripts = [];
	let start = page.indexOf("<script>");
	while (start !== -1) {
		const end = page.indexOf("</script>", start);
		scripts.push(page.slice(start, end));
		start = page.indexOf("<script>", end);
	}
	return scripts;
};

it("should inline only the chunk's own script after an asset it references changes", (done) => {
	const before = inlineScripts();
	expect(before).toHaveLength(1);
	expect(before[0]).toContain("__note_url__");
	expect(before[0]).not.toContain("__note_value__");
	NEXT((err) => {
		if (err) return done(err);
		const after = inlineScripts();
		expect(after).toHaveLength(1);
		expect(after[0]).toContain("__note_url__");
		expect(after[0]).not.toContain("__note_value__");
		expect(after[0]).not.toMatch(/\["webpackHotUpdate"\]\(/);
		done();
	});
});
