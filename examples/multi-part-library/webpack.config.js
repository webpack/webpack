"use strict";

const path = require("path");

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	// mode: "development" || "production",
	entry: {
		alpha: "./alpha",
		beta: "./beta"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyLibrary.[name].js",
		library: ["MyLibrary", "[name]"],
		libraryTarget: "umd"
	}
};

module.exports = config;
