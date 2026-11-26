"use strict";

const { ProvideSharedPlugin } = require("../../../../").sharing;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single"
	},
	plugins: [
		new ProvideSharedPlugin({
			provides: ["x"]
		})
	]
};
