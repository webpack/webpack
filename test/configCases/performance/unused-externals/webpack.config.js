"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "warning",
		unusedExternals: true
	},
	externals: {
		path: "commonjs path",
		"never-imported": "commonjs never-imported",
		"also-never-imported": "var AlsoNever"
	}
};
