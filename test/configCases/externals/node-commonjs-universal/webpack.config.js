"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "known-node-version",
		target: ["node22.12", "web"],
		output: { module: true },
		experiments: { outputModule: true }
	},
	{
		name: "unknown-node-version",
		target: ["node", "web"],
		output: { module: true },
		experiments: { outputModule: true }
	}
];
