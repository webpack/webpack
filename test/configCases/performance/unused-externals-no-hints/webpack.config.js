"use strict";

/** @import { Configuration } from "../../../../" */

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {Configuration} */
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
