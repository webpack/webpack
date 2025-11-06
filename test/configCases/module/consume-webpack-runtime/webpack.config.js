"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = [
	{
		node: false,
		mode: "production",
		devtool: false,
		optimization: {
			concatenateModules: true
		}
	},
	{
		node: false,
		mode: "production",
		devtool: false,
		optimization: {
			concatenateModules: false
		}
	},
	{
		node: false,
		mode: "production",
		devtool: "eval",
		optimization: {
			concatenateModules: true
		}
	},
	{
		node: false,
		mode: "production",
		devtool: "eval",
		optimization: {
			concatenateModules: false
		}
	}
];
