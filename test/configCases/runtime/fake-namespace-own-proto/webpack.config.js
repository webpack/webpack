"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "development",
		devtool: false
	},
	{
		mode: "development",
		devtool: false,
		output: {
			environment: {
				arrowFunction: false,
				const: false,
				destructuring: false,
				forOf: false,
				optionalChaining: false,
				templateLiteral: false
			}
		}
	}
];
