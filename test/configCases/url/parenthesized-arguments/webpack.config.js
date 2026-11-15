"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		output: { assetModuleFilename: "[name][ext]" }
	},
	{
		target: "web",
		output: { module: true, assetModuleFilename: "[name][ext]" }
	}
];
