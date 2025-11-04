"use strict";

const path = require("path");
const webpack = require("../../../");

const manifest = "../0-vendor/dist/vendor-manifest.json";

/** @type {import("webpack").Configuration} */
const config = {
	// mode: "development" || "production",
	context: __dirname,
	entry: "./example-app",
	output: {
		filename: "app.js",
		path: path.resolve(__dirname, "dist")
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: require(manifest)
		})
	]
};

module.exports = config;
