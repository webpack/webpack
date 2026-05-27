"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	output: {
		pathinfo: false
	},
	optimization: {
		moduleIds: "named",
		concatenateModules: false,
		inlineExports: true,
		minimize: false
	}
};
