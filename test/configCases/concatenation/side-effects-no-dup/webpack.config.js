"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./index.js",
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				sideEffect: {
					test: /side-effect\.js/,
					name: "side-effect",
					enforce: true
				}
			}
		}
	}
};
