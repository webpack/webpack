"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	output: {
		pathinfo: "verbose"
	},
	optimization: {
		concatenateModules: true,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	stats: {
		optimizationBailout: true
	}
};
