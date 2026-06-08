"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	optimization: {
		splitChunks: {
			chunks: "initial",
			minSize: 0,
			cacheGroups: {
				shared: { test: /shared/, name: "shared", enforce: true }
			}
		}
	}
};
