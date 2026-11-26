"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	module: {
		rules: [
			{
				test: /page\.html$/,
				loader: path.resolve(__dirname, "ast-loader.js")
			}
		]
	},
	optimization: {
		emitOnErrors: true
	},
	bail: false,
	experiments: {
		html: true
	}
};
