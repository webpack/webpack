"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

// Schema validation support for file URLs is handled separately.
/** @type {import("../../../../").Configuration} */
module.exports = {
	validate: false,
	module: {
		// match the module by a file URL instance instead of a path string
		noParse: pathToFileURL(path.resolve(__dirname, "not-parsed.js"))
	}
};
