"use strict";

const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	devtool: false,
	node: { __dirname: false },
	output: {
		publicPath: "",
		chunkFilename: "[name].js"
	},
	optimization: { chunkIds: "named" },
	plugins: [new SSRManifestPlugin()]
};
