it("should warn once for CSS-only and mixed chunks", () => {
	const stats = __STATS__.children[__STATS_I__];
	expect(stats.warnings.map(warning => warning.chunkName).sort()).toEqual([
		"mixed?query",
		"styles#fragment",
		"styles?query"
	]);
	for (const name of ["styles?query", "styles#fragment"]) {
		const chunk = stats.chunks.find(chunk => chunk.names.includes(name));
		expect(chunk.files).toEqual([`web/css/${name}.css`]);
	}
	expect(stats.chunks.find(chunk => chunk.names.includes("mixed?query")).files.sort())
		.toEqual(["web/css/mixed?query.css", "web/js/mixed?query.js"]);
	expect(stats.chunks.find(chunk => chunk.names.includes("empty?query")).files)
		.toEqual([]);
});
