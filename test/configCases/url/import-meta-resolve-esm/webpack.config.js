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
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		assetModuleFilename: "[name][ext]"
	}
};
