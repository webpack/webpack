"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		localImportBindings: true,
		concatenateModules: false
	}
};
