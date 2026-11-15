"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				c: { test: /[\\/]c\.js$/, name: "c", chunks: "async", enforce: true },
				x: { test: /[\\/]x\.js$/, name: "x", chunks: "async", enforce: true }
			}
		}
	}
};
