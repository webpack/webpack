"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		parser: {
			javascript: {
				strictThisContextOnImports: true
			}
		}
	},
	optimization: {
		sideEffects: true,
		usedExports: true,
		concatenateModules: false
	}
};
