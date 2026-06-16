"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "known-getter",
		// node version known to support `process.getBuiltinModule()` (>= 22.3)
		target: ["node22.12", "web"],
		output: { module: true },
		experiments: { outputModule: true }
	},
	{
		name: "fallback",
		// node version predating `process.getBuiltinModule()` -> try/catch + createRequire
		target: ["node18", "web"],
		output: { module: true },
		experiments: { outputModule: true }
	}
];
