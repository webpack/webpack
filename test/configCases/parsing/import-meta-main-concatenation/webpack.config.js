"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	optimization: {
		concatenateModules: true,
		minimize: false
	},
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
