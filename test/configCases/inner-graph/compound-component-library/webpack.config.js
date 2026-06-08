"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	output: {
		library: {
			type: "commonjs2"
		}
	},
	optimization: {
		usedExports: true,
		innerGraph: true,
		usedExportProperties: true,
		minimize: false,
		concatenateModules: true
	}
};
