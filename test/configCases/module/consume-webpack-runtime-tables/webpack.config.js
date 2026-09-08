"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "concatenated",
		target: "node",
		optimization: { concatenateModules: true },
		output: { module: true, chunkFormat: "module" }
	},
	{
		name: "not-concatenated",
		target: "node",
		optimization: { concatenateModules: false },
		output: { module: true, chunkFormat: "module" }
	}
];
