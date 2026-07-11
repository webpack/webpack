"use strict";

const path = require("node:path");
const webpack = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./entry.js",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: path.resolve(__dirname, "./non-blank-manifest.json"),
			name: "non-blank-manifest"
		})
	]
};
