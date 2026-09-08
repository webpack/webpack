"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { module: true },
	mode: "production",
	target: "async-node",
	devtool: false,
	externalsType: "module",
	externals: {
		fs: "module fs"
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
