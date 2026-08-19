"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedDefines: true
	},
	plugins: [new DefinePlugin({ USED_FLAG: JSON.stringify(true) })]
};
