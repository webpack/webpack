"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		libraryTarget: "commonjs2"
	},
	externals: {
		"amd-module": {
			amd: "amd-module"
		}
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
