"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/**
 * @param {boolean} url whether CSS url() handling is enabled
 * @returns {Configuration} configuration
 */
const config = (url) => ({
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	output: {
		uniqueName: "value-url-imported"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		parser: {
			css: { url },
			"css/module": { url }
		},
		rules: [
			{
				test: /\.module\.css$/i,
				type: "css/module"
			}
		]
	},
	plugins: [new webpack.DefinePlugin({ URL_ENABLED: JSON.stringify(url) })]
});

/** @type {Configuration[]} */
module.exports = [config(true), config(false)];
