"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "web",
		target: ["web", "node"],
		devtool: false,
		mode: "development",
		experiments: {
			css: true,
			outputModule: true
		}
	},
	{
		name: "node",
		target: ["web", "node"],
		devtool: false,
		mode: "development",
		experiments: {
			css: true,
			outputModule: true
		}
	}
];
