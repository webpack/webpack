"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	optimization: {
		minimize: false,
		concatenateModules: true
	},
	experiments: {
		outputModule: true
	},
	output: {
		library: {
			type: "module"
		}
	}
};
