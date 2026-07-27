"use strict";

/** @type {import("../../../../").Configuration} */
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
