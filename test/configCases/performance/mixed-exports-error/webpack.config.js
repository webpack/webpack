"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "commonjs2" }
	},
	performance: {
		hints: "error",
		mixedExports: true
	}
};
