"use strict";

// Force the entry's heavy dependency into a separate chunk via
// `optimization.splitChunks`. The extracted HTML must include a script tag
// for the split-out vendor chunk in addition to the entry chunk so the
// browser loads both.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					chunks: "all",
					enforce: true
				}
			}
		}
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	experiments: {
		html: true
	}
};
