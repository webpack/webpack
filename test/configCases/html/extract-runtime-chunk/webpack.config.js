"use strict";

// Combines `extract: true` with `optimization.runtimeChunk` targeting only
// the synthetic entries that HtmlModulesPlugin creates for `<script src>`
// references. The extracted HTML must reference both the split-out runtime
// chunk and the entry chunk — otherwise the browser hits
// `__webpack_require__ is not defined` when loading the entry chunk first.
// We avoid splitting the test bundle's own runtime by checking the entry
// name in the runtimeChunk factory.

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
