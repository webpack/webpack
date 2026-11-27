"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		chunkFilename: "[id].js"
	},
	plugins: [
		new webpack.BannerPlugin({ banner: "chunk [name]" }),
		new webpack.BannerPlugin({ banner: "multiline\nchunk [name]" })
	]
};
