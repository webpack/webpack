"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	entry: {
		styles: "./style.css",
		main: "./index.js"
	},
	module: {
		generator: {
			css: {
				exportsOnly: false
			}
		}
	},
	output: {
		filename: "[name].js",
		cssFilename: "[name].css"
	},
	optimization: {
		chunkIds: "named",
		minimize: false
	},
	experiments: {
		css: true
	},
	plugins: [new SSRManifestPlugin()]
};
