"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		environment: {
			nodePrefixForCoreModules: false
		}
	},
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				dep: { test: /dep/, name: "dep", chunks: "all", enforce: true }
			}
		}
	}
};
