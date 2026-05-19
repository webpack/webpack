"use strict";

// Combines `extract: true` with `optimization.runtimeChunk` targeting only
// the synthetic entries that HtmlModulesPlugin creates for `<script src>`
// references. The extracted HTML must reference both the split-out runtime
// chunk and the entry chunk — otherwise the browser hits
// `__webpack_require__ is not defined` when loading the entry chunk first.
// The test bundle's own runtime is left in-place so the harness can still
// load `bundle0.js` directly.

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: {
			name: (entrypoint) =>
				entrypoint.name.startsWith("__html_") ? "html-runtime" : undefined
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
