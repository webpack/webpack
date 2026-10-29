"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				m: {
					test: /[\\/]m\.js$/,
					name: "m",
					chunks: "initial",
					minChunks: 2,
					enforce: true
				}
			}
		}
	}
};
