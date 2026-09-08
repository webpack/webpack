"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web"
	},
	{
		output: {
			filename: "[name].bundle1.js"
		},
		target: "web",
		optimization: {
			runtimeChunk: "single"
		}
	},
	{
		output: { module: true },
		target: "web"
	},
	{
		target: "web",
		output: {
			module: true,
			filename: "[name].bundle3.mjs"
		},
		optimization: {
			runtimeChunk: "single"
		}
	}
];
