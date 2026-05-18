"use strict";

// Verifies `output.htmlFilename` overrides the default derived from
// `output.filename`. Files are emitted under a `pages/` subdirectory with a
// hash and the source basename, mirroring how users typically customise the
// CSS pipeline's `output.cssFilename`.

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
		chunkFilename: "[name].chunk.js",
		htmlFilename: "pages/[name].[contenthash:8].html",
		htmlChunkFilename: "pages/[name].[contenthash:8].html"
	},
	optimization: {
		chunkIds: "named"
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
