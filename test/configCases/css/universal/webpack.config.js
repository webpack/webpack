"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		output: { module: true },
		name: "web",
		target: ["web", "node"],
		devtool: false,
		mode: "development",
		experiments: {
			css: true
		}
	},
	{
		output: { module: true },
		name: "node",
		target: ["web", "node"],
		devtool: false,
		mode: "development",
		experiments: {
			css: true
		}
	}
];
