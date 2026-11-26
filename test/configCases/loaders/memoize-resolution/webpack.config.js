"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	resolveLoader: {
		alias: {
			"query-loader": "echo-loader?flag=on"
		}
	},
	module: {
		rules: [
			{
				test: /[ab]\.js$/,
				use: "echo-loader"
			},
			{
				test: /c\.js$/,
				use: { loader: "echo-loader", options: { msg: "cc" } }
			},
			{
				test: /d\.js$/,
				use: { loader: "echo-loader", options: { msg: "dd" } }
			},
			{
				test: /[ef]\.js$/,
				use: "query-loader"
			}
		]
	}
};
