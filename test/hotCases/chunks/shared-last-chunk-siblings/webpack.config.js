"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				// Group "./a" becomes [x, s] and group "./b" just [s]: both end in "s".
				x: {
					test: /[\\/]x\.js$/,
					name: "x",
					chunks: "async",
					enforce: true,
					priority: 10
				},
				s: { test: /[\\/][ab]\.js$/, name: "s", chunks: "async", enforce: true }
			}
		}
	}
};
