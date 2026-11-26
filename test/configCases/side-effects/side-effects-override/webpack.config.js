"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: path.resolve(__dirname, "node_modules/pmodule"),
				sideEffects: true
			},
			{
				test: path.resolve(__dirname, "node_modules/nmodule"),
				sideEffects: false
			}
		]
	}
};
