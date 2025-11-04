"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: {
		pageA: "./pageA",
		pageB: "./pageB"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				commons: {
					name: "commons",
					chunks: "initial",
					minChunks: 2,
					minSize: 0
				}
			}
		},
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
