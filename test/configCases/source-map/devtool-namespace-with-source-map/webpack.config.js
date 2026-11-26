"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {
		"entry-a": [path.join(__dirname, "./src/entry-a")],
		"entry-b": [path.join(__dirname, "./src/entry-b")]
	},

	output: {
		filename: "[name]-bundle.js",
		library: "library-[name]",
		libraryTarget: "commonjs",
		devtoolNamespace: "library-[name]"
	},
	devtool: "source-map"
};
