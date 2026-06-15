"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "optional-chaining",
		target: ["node22.12", "web"],
		output: { module: true },
		experiments: { outputModule: true }
	},
	{
		name: "no-optional-chaining",
		target: ["node22.12", "web"],
		output: { module: true, environment: { optionalChaining: false } },
		experiments: { outputModule: true }
	}
];
