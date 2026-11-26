"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		mangleExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
