"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = [
	{
		context: path.join(__dirname, "../external"),
		entry: "../external-in-node/index.js",
		target: "node",
		optimization: {
			chunkIds: "named",
			moduleIds: "named"
		},
		experiments: {
			css: true
		}
	},
	{
		output: { module: true },
		context: path.join(__dirname, "../external"),
		entry: "../external-in-node/index.js",
		target: "node",
		optimization: {
			chunkIds: "named",
			moduleIds: "named"
		},
		experiments: {
			css: true
		}
	}
];
