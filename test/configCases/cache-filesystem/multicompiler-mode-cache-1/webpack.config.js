"use strict";

// default settings. should just work

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem",
			name: "name2"
		}
	},
	{
		mode: "production",
		entry: "./index",
		cache: {
			type: "filesystem",
			name: "name1"
		}
	},
	{
		mode: "production",
		entry: "./index",
		cache: true
	},
	{
		mode: "production",
		entry: "./index",
		cache: true
	}
];
