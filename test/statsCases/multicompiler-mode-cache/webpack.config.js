"use strict";

/** @type {import("../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem",
			name: "name1"
		},
		stats: { preset: "minimal" }
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem",
			name: "name1"
		},
		stats: { preset: "minimal" }
	}
];
