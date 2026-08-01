"use strict";

const webpack = require("../../");

/** @type {import("webpack").Configuration} */
const config = {
	optimization: {
		chunkIds: "named" // keep filenames stable across modes (for this example)
	},
	plugins: [new webpack.SSRManifestPlugin()]
};

module.exports = config;
