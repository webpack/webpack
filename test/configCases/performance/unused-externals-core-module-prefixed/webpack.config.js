"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	// Declared prefixed, imported as 'path' — the resolver accepts either
	externals: {
		"node:path": "commonjs node:path"
	}
};
