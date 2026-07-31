"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "concatenated",
		target: "node",
		optimization: { concatenateModules: true },
		experiments: { outputModule: true },
		output: { module: true, chunkFormat: "module" }
	},
	{
		name: "not-concatenated",
		target: "node",
		optimization: { concatenateModules: false },
		experiments: { outputModule: true },
		output: { module: true, chunkFormat: "module" }
	}
];
