it("should load a lazy chunk whose name holds '?'", async () => {
	expect(
		(await import(/* webpackChunkName: "lazy?query" */ "./value")).default
	).toBe(42);
});

it("should warn once for CSS-only and mixed chunks", () => {
	const stats = __STATS__.children[__STATS_I__];
	expect(stats.warnings.map(warning => warning.chunkName).sort()).toEqual([
		"lazy?query",
		"mixed?query",
		"styles#fragment",
		"styles?query"
	]);
	for (const [name, file] of [
		["styles?query", "styles_query"],
		["styles#fragment", "styles_fragment"]
	]) {
		const chunk = stats.chunks.find(chunk => chunk.names.includes(name));
		expect(chunk.files).toEqual([`web/css/${file}.css`]);
	}
	expect(stats.chunks.find(chunk => chunk.names.includes("mixed?query")).files.sort())
		.toEqual(["web/css/mixed_query.css", "web/js/mixed_query.js"]);
	expect(stats.chunks.find(chunk => chunk.names.includes("empty?query")).files)
		.toEqual([]);
});
