"use strict";

const path = require("path");

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	entry: "./example.js",
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		chunkFilename: "[name].js",
		publicPath: "/dist/"
	},
	optimization: {
		concatenateModules: true,
		usedExports: true,
		providedExports: true,
		chunkIds: "deterministic" // To keep filename consistent between different modes (for example building only)
	}
};

module.exports = config;
