"use strict";

const optimization = {
	sideEffects: true,
	usedExports: true,
	providedExports: true,
	minimize: false
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "production",
		output: { filename: "bundle0.js" },
		optimization: { ...optimization, concatenateModules: false }
	},
	{
		mode: "production",
		output: { filename: "bundle1.js" },
		optimization: { ...optimization, concatenateModules: true }
	}
];
