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
		resolve: {
			fallback: {
				path: false
			}
		}
	}
];
