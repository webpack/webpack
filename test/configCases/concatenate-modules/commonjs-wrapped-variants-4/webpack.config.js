"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		sideEffects: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
