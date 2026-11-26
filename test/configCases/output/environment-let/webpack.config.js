"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [
	{
		mode: "production",
		output: {
			environment: {
				const: true,
				let: true
			}
		},
		optimization: { minimize: false }
	},
	{
		mode: "production",
		output: {
			environment: {
				const: false,
				let: true
			}
		},
		optimization: { minimize: false }
	},
	{
		mode: "production",
		output: {
			environment: {
				const: false,
				let: false
			}
		},
		optimization: { minimize: false }
	}
];
