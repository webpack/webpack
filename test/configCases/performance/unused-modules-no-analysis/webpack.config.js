"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		sideEffects: false
	},
	performance: {
		hints: "warning",
		unusedModules: true
	}
};
