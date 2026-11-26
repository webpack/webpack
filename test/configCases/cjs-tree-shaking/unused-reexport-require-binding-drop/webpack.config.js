"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	module: {
		parser: {
			javascript: {
				commonjsMagicComments: true
			}
		},
		rules: [
			{
				test: path.resolve(__dirname, "sef.cjs"),
				sideEffects: false
			}
		]
	},
	optimization: {
		minimize: false,
		moduleIds: "named",
		mangleExports: false,
		usedExports: true,
		sideEffects: true,
		concatenateModules: false
	}
};
