"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		target: "node",
		optimization: { concatenateModules: { commonjs: true } }
	},
	{
		mode: "production",
		target: "node",
		optimization: { concatenateModules: true }
	}
];
