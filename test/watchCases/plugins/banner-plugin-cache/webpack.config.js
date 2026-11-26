"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: { bundle: "./index.js", entry2: "./entry2.js" },
	output: { filename: "[name].js" },
	plugins: [new webpack.BannerPlugin("banner is a string")]
};
