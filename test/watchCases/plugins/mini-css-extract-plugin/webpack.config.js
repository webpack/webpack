"use strict";

const MCEP = require("mini-css-extract-plugin");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MCEP.loader, "css-loader"]
			}
		]
	},
	output: {
		publicPath: "",
		pathinfo: false
	},
	target: "web",
	node: {
		__dirname: false
	},
	plugins: [new MCEP()]
};
