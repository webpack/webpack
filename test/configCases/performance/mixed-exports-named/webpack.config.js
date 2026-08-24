"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false
	},
	output: {
		library: { type: "commonjs2", export: "default" }
	},
	performance: {
		hints: "warning",
		mixedExports: true
	}
};
