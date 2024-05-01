"use strict";

// with explicit cache names

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
			type: "filesystem"
		}
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
			type: "filesystem"
		}
	},
	{
		name: "3rd compiler",
		mode: "production",
		entry: "./index",
		cache: {
			name: "filesystem",
			type: "filesystem"
		}
	}
];
