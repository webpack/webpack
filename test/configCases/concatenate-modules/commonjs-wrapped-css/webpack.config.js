"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	experiments: { css: true },
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	}
};
