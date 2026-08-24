"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	devtool: "eval",
	performance: {
		hints: "warning",
		evalUsage: true
	}
};
