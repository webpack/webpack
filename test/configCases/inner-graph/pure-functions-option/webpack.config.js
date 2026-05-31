"use strict";

const base = {
	mode: "production",
	module: {
		rules: [
			{
				test: /pure-source\.js$/,
				parser: {
					pureFunctions: ["pureFn", "pureArrow", "default"]
				}
			}
		]
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "pure-functions-option without module concatenation",
		optimization: {
			concatenateModules: false
		}
	},
	{
		...base,
		name: "pure-functions-option with module concatenation"
	}
];
