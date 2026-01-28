"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small
		},
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
