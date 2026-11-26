"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration[]} */
module.exports = [
	{
		output: {
			libraryTarget: "global"
		},
		externals: {
			external: ["process", "version"]
		},
		plugins: [
			new webpack.DefinePlugin({
				EXPECTED: JSON.stringify(process.version)
			})
		]
	},
	{
		externals: {
			external: ["Array", "isArray"]
		},
		plugins: [
			new webpack.DefinePlugin({
				EXPECTED: "Array.isArray"
			})
		]
	}
];
