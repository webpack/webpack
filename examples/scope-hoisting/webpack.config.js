"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	optimization: {
		usedExports: true,
		concatenateModules: true,
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
