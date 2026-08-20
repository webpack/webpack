"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "production",
		devtool: false,
		experiments: {
			css: true
		},
		optimization: {
			minimize: false
		},
		output: {
			cssFilename: "[name].css"
		}
	},
	{
		target: "web",
		mode: "development",
		devtool: false,
		experiments: {
			css: true
		},
		output: {
			cssFilename: "dev-[name].css"
		}
	}
];
