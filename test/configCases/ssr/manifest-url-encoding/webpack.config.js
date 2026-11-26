"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	output: {
		publicPath: "/static/",
		chunkFilename: "sub dir/[name].js",
		assetModuleFilename: "asset dir/[name][ext]?v=%2F"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	},
	optimization: {
		minimize: false,
		chunkIds: "named"
	},
	plugins: [new SSRManifestPlugin()]
};
