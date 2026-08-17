"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		duplicateModules: true
	},
	optimization: {
		splitChunks: false
	}
};
