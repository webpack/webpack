"use strict";

// A function `output.filename` is called for an extracted entry too, so the
// directory it returns is kept and only the file's stem is renamed.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		}
	},
	entry: {
		main: "./index.js",
		page: "./page.html"
	},
	output: {
		filename: (pathData) => `assets/${pathData.chunk.name}.mjs`,
		cssFilename: (pathData) => `styles/${pathData.chunk.name}.css`,
		module: true
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		css: true,
		outputModule: true
	}
};
