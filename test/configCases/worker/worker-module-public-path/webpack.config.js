"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node14",
	mode: "development",
	devtool: false,
	optimization: {
		chunkIds: "named"
	},
	output: {
		module: true,
		// A static workerPublicPath (here resolving locally) keeps the URL analyzable.
		workerPublicPath: "./"
	},
	experiments: {
		outputModule: true
	}
};
