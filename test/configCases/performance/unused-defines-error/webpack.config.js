"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		unusedDefines: true
	},
	plugins: [
		new DefinePlugin({
			USED_FLAG: JSON.stringify(true),
			UNUSED_FLAG: JSON.stringify(false)
		})
	]
};
