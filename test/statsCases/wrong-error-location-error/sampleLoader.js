const sourceMap = require("source-map");

/**
 *
 * @param {string|Buffer} source Content of the resource file
 */
function sampleLoader(source) {
	var map = new sourceMap.SourceMapGenerator({
		file: "index.js",
	});

	map.addMapping({
		generated: {
			line: 4,
			column: 13
		},
		original: {
			line: 2,
			column: 13
		},
		source: "index.js",
	})

	map.addMapping({
		generated: {
			line: 4,
			column: 33
		},
		original: {
			line: 2,
			column: 33
		},
		source: "index.js",
	})

	this.callback(null, `\n\n${source}`, map.toJSON())
	return;
}

module.exports = sampleLoader;
