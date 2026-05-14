"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	optimization: {
		sideEffects: true,
		moduleIds: "named",
		chunkIds: "named",
		concatenateModules: false,
		minimize: false
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
