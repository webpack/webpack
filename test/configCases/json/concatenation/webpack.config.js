"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		chunkIds: "named",
		moduleIds: "named"
	},
	module: {
		parser: {
			json: {
				namedExports: true
			}
		}
	}
};
