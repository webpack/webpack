"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: { 0: "./index.js" },
	output: { filename: "[name].js" },
	optimization: { chunkIds: "named" },
	plugins: [new webpack.HotModuleReplacementPlugin()]
};
