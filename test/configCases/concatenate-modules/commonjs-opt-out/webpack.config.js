"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: false },
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	stats: {
		optimizationBailout: true
	}
};
