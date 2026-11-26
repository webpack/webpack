"use strict";

/** @import { Configuration } from "../../../../" */

const base = {
	target: ["web", "node"],
	mode: "development",
	output: {
		module: true,
		filename: "[name].mjs"
	},
	module: {
		rules: [
			{
				test: /\.bin$/,
				type: "asset/bytes"
			}
		]
	}
};

/** @type {Configuration[]} */
module.exports = [
	{ name: "web", ...base },
	{ name: "node", ...base }
];
