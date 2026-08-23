"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "umd" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
