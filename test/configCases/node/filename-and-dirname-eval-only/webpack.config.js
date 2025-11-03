"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		node: {
			__filename: "eval-only",
			__dirname: "eval-only"
		}
	},
	{
		target: "node",
		node: {
			__filename: "eval-only",
			__dirname: "eval-only"
		},
		output: {
			module: true
		},
		experiments: {
			outputModule: true
		}
	},
	{
		target: "node24",
		node: {
			__filename: "eval-only",
			__dirname: "eval-only"
		},
		output: {
			module: true
		},
		experiments: {
			outputModule: true
		}
	},
	{
		target: "web",
		node: {
			__filename: "eval-only",
			__dirname: "eval-only"
		},
		resolve: {
			fallback: {
				path: false
			}
		}
	},
	{
		target: "web",
		node: {
			__filename: "eval-only",
			__dirname: "eval-only"
		},
		output: {
			module: true
		},
		experiments: {
			outputModule: true
		},
		resolve: {
			fallback: {
				path: false
			}
		}
	}
];
