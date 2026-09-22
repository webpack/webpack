"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	module: {
		// a document-less target emits no stylesheets by default; opt in so the
		// manifest has files to classify
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js",
		// the plugin must ask what the asset is, not what its name ends with
		cssFilename: "[name].stylesheet",
		cssChunkFilename: "[name].stylesheet"
	},
	optimization: {
		chunkIds: "named",
		minimize: false,
		splitChunks: {
			cacheGroups: {
				// the split that gives the route a second stylesheet
				alpha: {
					test: /alpha\.css$/,
					chunks: "all",
					enforce: true,
					name: "alpha"
				}
			}
		}
	},
	experiments: {
		css: true
	},
	plugins: [new SSRManifestPlugin()]
};
