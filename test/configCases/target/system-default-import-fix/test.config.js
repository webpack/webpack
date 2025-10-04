"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./test.js",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "bundle.js",
		libraryTarget: "system"
	},
	externals: {
		react: "react",
		"react-with-default": "react-with-default"
	},
	resolve: {
		alias: {
			react: path.resolve(__dirname, "react.js"),
			"react-with-default": path.resolve(__dirname, "react-with-default.js")
		}
	},
	node: {
		__dirname: false,
		__filename: false
	}
};
