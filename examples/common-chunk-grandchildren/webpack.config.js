"use strict";

const path = require("path");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	entry: {
		main: ["./example.js"]
	},
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small, in practice you can use the defaults
		},
		chunkIds: "named" // To keep filename consistent between different modes (for example building only)
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	}
};

module.exports = config;
