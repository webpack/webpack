"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "node",
	performance: {
		hints: "stats",
		unusedDefines: true,
		unusedExternals: true
	},
	externals: {
		path: "commonjs path",
		"never-imported": "commonjs never-imported"
	},
	plugins: [
		new DefinePlugin({
			USED_FLAG: JSON.stringify(true),
			UNUSED_FLAG: JSON.stringify(false)
		})
	]
};
