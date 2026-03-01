"use strict";

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		name: "2-module cycle",
		mode: "development",
		entry: "./index.js",
		stats: {
			errors: true,
			errorDetails: true,
			errorStack: false
		}
	},
	{
		name: "3-module cycle",
		mode: "development",
		entry: "./index-3.js",
		stats: {
			errors: true,
			errorDetails: true,
			errorStack: false
		}
	}
];
