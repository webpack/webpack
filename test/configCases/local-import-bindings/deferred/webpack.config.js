"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		deferImport: true
	},
	module: {
		parser: {
			javascript: {
				localImportBindings: true
			}
		}
	},
	optimization: {
		concatenateModules: false
	}
};
