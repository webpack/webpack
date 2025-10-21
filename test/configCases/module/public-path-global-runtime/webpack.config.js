"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		output: {
			environment: { globalThis: false }
		},
		stats: {
			runtimeModules: true
		}
	},
	{
		target: "web",
		output: {
			environment: { globalThis: true }
		},
		stats: {
			runtimeModules: true
		}
	}
];
