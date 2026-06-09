"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: ["./first.js", "./second.js"],
		output: {
			filename: "lib.js",
			library: {
				type: "commonjs2"
			}
		},
		optimization: {
			concatenateModules: true,
			avoidEntryIife: true
		},
		target: "node"
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		},
		target: "node"
	}
];
