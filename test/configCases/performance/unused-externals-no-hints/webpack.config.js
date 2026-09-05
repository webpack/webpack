"use strict";

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: false,
		unusedConfig: true
	},
	externals: {
		path: "commonjs path",
		"never-imported": "commonjs never-imported"
	}
};
