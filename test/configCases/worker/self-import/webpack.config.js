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
		target: "web",
		experiments: {
			outputModule: true
		}
	},
	{
		target: "web",
		output: {
			filename: "[name].bundle3.mjs"
		},
		optimization: {
			runtimeChunk: "single"
		},
		experiments: {
			outputModule: true
		}
	}
];
