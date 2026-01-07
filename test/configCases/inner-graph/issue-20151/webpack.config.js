"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node14",
	optimization: {
		minimize: false,
		mangleExports: false,
		concatenateModules: false,
		emitOnErrors: true
	},
	output: {
		module: true
	},
	experiments: {
		outputModule: true
	},
	externals: ["acorn"]
};
