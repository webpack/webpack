"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: {
		chunkLoading: false
	},
	optimization: {
		concatenateModules: false
	},
	experiments: {
		deferImport: true
	}
};
