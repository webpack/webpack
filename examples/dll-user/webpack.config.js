"use strict";

const path = require("path");
const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	plugins: [
		new webpack.DllReferencePlugin({
			context: path.join(__dirname, "..", "dll"),
			manifest: require("../dll/dist/alpha-manifest.json")
		}),
		new webpack.DllReferencePlugin({
			scope: "beta",
			manifest: require("../dll/dist/beta-manifest.json"),
			extensions: [".js", ".jsx"]
		})
	]
};

module.exports = config;
