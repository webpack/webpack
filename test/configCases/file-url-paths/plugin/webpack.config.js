"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const webpack = require("../../../../");

// DllReferencePlugin reads `manifest` from disk during the build, so the build
// only succeeds if the file URL is resolved at the plugin's use-site.
// Schema validation support for file URLs is handled separately.
/** @type {import("../../../../").Configuration} */
module.exports = {
	validate: false,
	plugins: [
		new webpack.DllReferencePlugin({
			manifest: pathToFileURL(path.join(__dirname, "dll-manifest.json")), // file URL instance
			scope: "dll",
			sourceType: "commonjs2"
		})
	]
};
