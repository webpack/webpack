"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	}
};
