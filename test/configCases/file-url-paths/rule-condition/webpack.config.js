"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

// Schema validation support for file URLs is handled separately.
/** @type {import("../../../../").Configuration} */
module.exports = {
	validate: false,
	module: {
		rules: [
			{
				test: /\.js$/,
				// match by a file URL instance instead of a path string
				include: pathToFileURL(path.resolve(__dirname, "included")),
				use: path.resolve(__dirname, "loader.js")
			}
		]
	}
};
