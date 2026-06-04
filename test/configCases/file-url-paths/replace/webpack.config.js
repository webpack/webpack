"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new webpack.NormalModuleReplacementPlugin(
			/replaceme\.js$/,
			pathToFileURL(path.join(__dirname, "replacement.js")) // file URL instance
		)
	]
};
