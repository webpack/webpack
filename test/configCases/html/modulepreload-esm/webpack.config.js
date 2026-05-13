"use strict";

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
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		module: true
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true,
		outputModule: true
	}
};
