"use strict";

/** @type {import("../../../../").RuleSetRule[]} */
const rules = [{ test: /pure-/, sideEffects: false }];

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		target: "node",
		module: { rules },
		optimization: { concatenateModules: true }
	},
	{
		mode: "production",
		target: "node",
		module: { rules },
		optimization: { concatenateModules: false }
	}
];
