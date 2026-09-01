"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	devtool: false,
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
