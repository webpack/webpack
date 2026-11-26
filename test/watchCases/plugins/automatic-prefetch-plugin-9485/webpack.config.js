"use strict";

const path = require("path");
const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /delayed/,
				use: path.resolve(__dirname, "./delayed")
			}
		]
	},
	plugins: [new webpack.AutomaticPrefetchPlugin()]
};
