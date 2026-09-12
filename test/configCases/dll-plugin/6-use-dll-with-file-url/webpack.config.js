"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const webpack = require("../../../../");

/**
 * Builds the file URL of a path, the form `import.meta.resolve()` returns.
 * @param {string} absolutePath an absolute path
 * @returns {string} a file URL
 */
const fileUrl = (absolutePath) => pathToFileURL(absolutePath).href;

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				oneOf: [
					{
						test: /\.abc\.js$/,
						loader: "../0-create-dll/g-loader.js",
						options: {
							test: 1
						}
					}
				]
			}
		]
	},
	optimization: {
		moduleIds: "named"
	},
	resolve: {
		extensions: [".js", ".jsx"]
	},
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: fileUrl(
				path.resolve(__dirname, "../../../js/config/dll-plugin/manifest0.json")
			),
			name: "../0-create-dll/dll.js",
			context: fileUrl(path.resolve(__dirname, "../0-create-dll")),
			sourceType: "commonjs2"
		})
	]
};
