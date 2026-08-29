// Emulates a tool that maps the content it compiled and only then prepends a
// BOM, the way dart-sass does for non-ASCII `compressed` output.
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function bomLoader(source) {
	const mappings = source
		.split("\n")
		.map((_, i) => (i === 0 ? "AAAA" : "AACA"))
		.join(";");

	this.callback(
		null,
		`\uFEFF${source}`,
		/** @type {import("webpack-sources").RawSourceMap} */ ({
			version: 3,
			file: "mod.js",
			sources: ["mod.js"],
			sourcesContent: [source],
			names: [],
			mappings
		})
	);
};
