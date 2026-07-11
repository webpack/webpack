"use strict";

/** @type {import("../../../").Configuration[]} */
module.exports = [
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 4, // trims error1's details, keeps the detail-less error2
			errors: true
		}
	},
	{
		entry: "./loader!./index.js",
		mode: "production",
		stats: {
			errorsSpace: 5, // keeps error1 in full, keeps the detail-less error2
			errors: true
		}
	}
];
