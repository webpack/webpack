"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		parser: {
			javascript: {
				importMetaResolve: true
			}
		}
	},
	output: {
		assetModuleFilename: "[name][ext]"
	}
};
