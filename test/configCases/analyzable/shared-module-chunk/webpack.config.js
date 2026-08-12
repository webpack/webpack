"use strict";

// A chunk holding a shared module still has javascript of its own, so `.ei` has
// something to import — only a chunk this compilation emits nothing for has not.

const path = require("path");
const { SharePlugin } = require("../../../../").sharing;

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	resolve: {
		alias: { "shared-lib": path.resolve(__dirname, "lib.js") }
	},
	output: {
		module: true,
		chunkFilename: "[name].mjs",
		publicPath: "auto"
	},
	optimization: { chunkIds: "named", splitChunks: false },
	plugins: [
		new SharePlugin({
			shared: { "shared-lib": { singleton: true, requiredVersion: false } }
		})
	]
};
