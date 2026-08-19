"use strict";

const { DefinePlugin } = require("../../../../");

// `hints` defaults to false outside production, so the report must not depend on it.
/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: false,
		unusedDefines: true
	},
	plugins: [
		new DefinePlugin({
			USED_FLAG: JSON.stringify(true),
			UNUSED_FLAG: JSON.stringify(false)
		})
	]
};
