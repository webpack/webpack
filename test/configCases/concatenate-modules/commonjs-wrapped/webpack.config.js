"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	stats: {
		optimizationBailout: true
	}
};
