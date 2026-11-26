"use strict";

/** @import { RuleSetRule, Configuration } from "../../../../" */

/** @type {RuleSetRule[]} */
const rules = [{ test: /pure-/, sideEffects: false }];

/** @type {Configuration[]} */
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
