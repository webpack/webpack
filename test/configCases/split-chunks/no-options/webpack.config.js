"use strict";

const { SplitChunksPlugin } = require("../../../../").optimize;

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		vendor: ["./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: false
	},
	plugins: [new SplitChunksPlugin()]
};
