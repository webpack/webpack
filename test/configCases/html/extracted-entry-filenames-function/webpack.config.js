"use strict";

// A function `output.filename` cannot be read for a `[name]`, and the
// `[id].css` it leaves behind would name synthetic ids — both fall back.

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
		filename: (pathData) => `${pathData.chunk.name}.mjs`,
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
