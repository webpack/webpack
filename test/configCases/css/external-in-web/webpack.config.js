"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = [
	{
		target: "web",
		optimization: {
			chunkIds: "named"
		},
		experiments: {
			css: true
		}
	},
	{
		output: { module: true },
		target: "web",
		optimization: {
			chunkIds: "named"
		},
		experiments: {
			css: true
		}
	}
];
