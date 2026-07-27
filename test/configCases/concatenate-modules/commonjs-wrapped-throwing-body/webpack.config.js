"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	output: {
		strictModuleErrorHandling: true
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
