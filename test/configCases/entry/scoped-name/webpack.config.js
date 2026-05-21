"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		"@scope/app": "./index.js"
	},
	output: {
		filename: "[name].js",
		chunkFilename: "chunks/[name].js"
	}
};
