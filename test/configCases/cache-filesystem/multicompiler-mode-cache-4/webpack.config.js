"use strict";

// with explicit cache names

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "default",
			type: "filesystem"
		}
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "default",
			type: "filesystem"
		}
	}
];
