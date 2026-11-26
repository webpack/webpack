"use strict";

/** @import { Configuration } from "../../../../" */

// no cache names

/** @type {Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem"
		}
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem",
			name: "default"
		}
	}
];
