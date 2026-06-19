"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	experiments: {
		outputModule: true
	},
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true,
		usedExports: true
	},
	externalsType: "module",
	externals: {
		path: "module path"
	}
};
