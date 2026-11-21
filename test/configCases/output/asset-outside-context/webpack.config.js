"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// a module above the context gets a [path] that climbs out of it
	context: path.join(__dirname, "app"),
	output: {
		assetModuleFilename: "[path][name][ext]"
	},
	module: {
		rules: [
			{
				test: /near\.png$/,
				type: "asset/resource",
				generator: {
					filename: "[name][ext]",
					outputPath: "../asset-outside-context-generated/"
				}
			},
			{ test: /far\.png$/, type: "asset/resource" }
		]
	}
};
