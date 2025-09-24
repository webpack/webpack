"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "web",
		target: ["web", "node"],
		experiments: {
			outputModule: true
		}
	},
	{
		name: "node",
		target: ["web", "node"],
		experiments: {
			outputModule: true
		}
	}
];
