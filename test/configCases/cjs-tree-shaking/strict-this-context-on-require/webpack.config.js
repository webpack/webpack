"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	module: {
		parser: {
			javascript: {
				strictThisContextOnImports: true
			}
		}
	},
	optimization: {
		minimize: false,
		usedExports: true,
		concatenateModules: false
	}
};
