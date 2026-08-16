"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "error",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	}
};
