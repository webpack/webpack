"use strict";

// Verifies `output.htmlFilename` overrides the default derived from
// `output.filename`. Files are emitted under a `pages/` subdirectory with a
// hash and the source basename, mirroring how users typically customise the
// CSS pipeline's `output.cssFilename`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
		htmlFilename: "pages/[name].[contenthash:8].html",
		htmlChunkFilename: "pages/[name].[contenthash:8].html",
		// `publicPath: "auto"` is what the undo-path test below needs: the mode where
		// asset and chunk URLs in the rewritten HTML carry a placeholder resolved relative
		// to the emitted HTML's location.
		publicPath: "auto"
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
