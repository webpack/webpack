"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { filename: "[name].js" },
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				dep: { test: /dep/, name: "dep", chunks: "initial", enforce: true }
			}
		}
	}
};
