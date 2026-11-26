"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /style\.css$/,
				use: [path.resolve(__dirname, "emit-css.js")]
			}
		]
	},
	experiments: {
		css: true
	}
};
