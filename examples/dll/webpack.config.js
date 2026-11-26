"use strict";

const path = require("path");
const webpack = require("../../");

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
const config = {
	// mode: "development" || "production",
	resolve: {
		extensions: [".js", ".jsx"]
	},
	entry: {
		alpha: ["./alpha", "./a", "module"],
		beta: ["./beta", "./b", "./c"]
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "MyDll.[name].js",
		library: "[name]_[fullhash]"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.join(__dirname, "dist", "[name]-manifest.json"),
			name: "[name]_[fullhash]"
		})
	]
};

module.exports = config;
