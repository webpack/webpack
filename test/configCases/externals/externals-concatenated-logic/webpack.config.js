"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: {
		minimize: false,
		concatenateModules: true
	},
	externals: {
		path: "module path"
	},
	externalsType: "module",
	output: {
		module: true,
		library: {
			type: "module"
		}
	}
};
