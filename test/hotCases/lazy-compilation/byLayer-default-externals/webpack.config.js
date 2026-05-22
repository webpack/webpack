"use strict";

// Verifies the `byLayer.default` fallback path: the lazy module sits in
// `other-layer`, which is not a key on `byLayer`, so `resolveByProperty`
// merges `byLayer.default` over the base. Both `fs` (base) and `path` (from
// `default`) must be reserved.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		library: {
			name: "demo",
			type: "umd"
		}
	},
	externalsType: "umd",
	externals: {
		fs: "fs",
		byLayer: {
			default: {
				path: "path"
			}
		}
	},
	module: {
		rules: [
			{
				test: /module\.js$/,
				layer: "other-layer"
			}
		]
	},
	experiments: {
		layers: true,
		lazyCompilation: {
			entries: false
		}
	}
};
