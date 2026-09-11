"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	target: "node",
	experiments: {
		css: true
	},
	module: {
		// a document-less target defaults to `exportsOnly`; opt in so the chunks
		// carry the stylesheets the manifest has to name
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	output: {
		cssChunkFilename: "[name].css"
	},
	optimization: {
		minimize: false,
		chunkIds: "named"
	},
	plugins: [new SSRManifestPlugin()]
};
