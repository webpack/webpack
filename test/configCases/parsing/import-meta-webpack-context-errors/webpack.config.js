"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "node",
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		chunkFormat: "module"
	}
};
