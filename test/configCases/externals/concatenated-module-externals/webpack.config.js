"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "async-node",
	externalsType: "module",
	externals: {
		fs: "module fs"
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: true,
		minimize: false
	}
};
