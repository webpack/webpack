"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		parser: {
			javascript: {
				localImportBindings: true
			}
		}
	},
	optimization: {
		concatenateModules: true
	}
};
