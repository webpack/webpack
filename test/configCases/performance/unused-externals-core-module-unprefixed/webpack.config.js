"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedConfig: true
	},
	// Declared unprefixed, imported as 'node:path' — the resolver accepts either
	externals: {
		path: "commonjs path"
	}
};
