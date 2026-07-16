"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: ["./index"],
	resolve: {
		extensions: [".js", ".jsx"]
	},
	output: {
		filename: "dll.js",
		chunkFilename: "[id].dll.js",
		libraryTarget: "commonjs2"
	},
	plugins: [
		new webpack.DllPlugin({
			path: path.resolve(
				__dirname,
				"../../../js/config/dll-plugin/manifest-scope-index.json"
			),
			entryOnly: false
		})
	]
};
