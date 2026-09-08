"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { module: true },
	mode: "production",
	target: "async-node",
	externalsType: "module",
	externals: {
		fs: "module fs"
	},
	optimization: {
		concatenateModules: true,
		minimize: false
	}
};
