"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: {
		deferImport: true
	},
	optimization: {
		localImportBindings: true,
		concatenateModules: false
	}
};
