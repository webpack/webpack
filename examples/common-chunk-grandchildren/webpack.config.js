"use strict";
const path = require("path");

module.exports = {
	// mode: "development || "production",
	entry: {
		main: ["./example.js"]
	},
	optimization: {
		splitChunks: {
			minSize: 0 // This example is too small, in practice you can use the defaults
		},
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	}
};
