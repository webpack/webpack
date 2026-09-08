"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { module: true },
	mode: "production",
	target: "node",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
