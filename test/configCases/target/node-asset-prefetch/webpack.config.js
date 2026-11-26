"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		target: "node",
		module: {
			rules: [{ test: /\.png$/, type: "asset/resource" }]
		}
	},
	{
		target: "webworker",
		module: {
			rules: [{ test: /\.png$/, type: "asset/resource" }]
		}
	}
];
