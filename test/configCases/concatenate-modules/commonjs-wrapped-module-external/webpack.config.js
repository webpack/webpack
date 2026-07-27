"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "async-node",
	devtool: false,
	externalsType: "module",
	externals: {
		fs: "module fs"
	},
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
