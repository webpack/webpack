"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		mode: "production",
		experiments: {
			css: true
		}
	}
];
