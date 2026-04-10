"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	output: {
		environment: {
			const: false
		}
	},
	optimization: {
		concatenateModules: false,
		minimize: false
	}
};
