"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	optimization: {
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
