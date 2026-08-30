// Emulates dart-sass: the map counts the BOM, so line 1 starts at column 1.
// `options.stringifyMap` returns it as JSON, the other shape a loader may use.
const { encodeMappings } = require("../../../../lib/util/createMappings");

/** @type {import("../../../../").LoaderDefinition<{ stringifyMap?: boolean }>} */
module.exports = function bomLoader(source) {
	const lines = source.split("\n");
	// Line 1 gets a second segment on the opening quote, so a shift that moved
	// more than the first segment would misplace the string literal.
	const quote = lines[0].indexOf('"');
	const mappings = encodeMappings(
		lines.map((_, line) =>
			line === 0
				? [
						{
							generatedColumn: 1,
							sourceIndex: 0,
							originalLine: 0,
							originalColumn: 0
						},
						{
							generatedColumn: 1 + quote,
							sourceIndex: 0,
							originalLine: 0,
							originalColumn: quote
						}
					]
				: {
						generatedColumn: 0,
						sourceIndex: 0,
						originalLine: line,
						originalColumn: 0
					}
		)
	);
	const name = /** @type {string} */ (this.resourcePath.split(/[\\/]/).pop());
	const map = {
		version: 3,
		file: name,
		sources: [name],
		sourcesContent: [source],
		names: [],
		mappings
	};

	this.callback(
		null,
		`\uFEFF${source}`,
		this.getOptions().stringifyMap
			? JSON.stringify(map)
			: /** @type {import("webpack-sources").RawSourceMap} */ (map)
	);
};
