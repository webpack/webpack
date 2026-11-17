"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: "./src/index.js",
	resolve: {
		restrictions: [path.resolve(__dirname, "src")]
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/source" }]
	},
	plugins: [
		new DefinePlugin({
			OUTSIDE_URL: JSON.stringify(
				pathToFileURL(path.resolve(__dirname, "outside/secret.txt")).href
			)
		})
	]
};
