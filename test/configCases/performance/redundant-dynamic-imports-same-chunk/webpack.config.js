"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	optimization: {
		splitChunks: false
	},
	performance: {
		hints: "warning",
		redundantDynamicImports: true
	}
};
