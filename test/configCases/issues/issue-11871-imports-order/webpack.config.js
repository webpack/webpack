"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "development"
	},
	{
		mode: "production"
	},
	{
		mode: "production",
		optimization: {
			concatenateModules: false
		}
	},
	{
		mode: "development",
		optimization: {
			concatenateModules: true
		}
	}
];
