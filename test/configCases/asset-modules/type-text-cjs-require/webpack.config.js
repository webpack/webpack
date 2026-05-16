"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		// CJS output (default)
	},
	{
		// ESM output
		experiments: {
			outputModule: true
		},
		output: {
			module: true,
			chunkFormat: "module"
		}
	}
];
