"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		// `module-import` path: electron built-ins are imported as ESM
		target: "electron-main",
		output: {
			module: true
		},
		optimization: {
			concatenateModules: false,
			minimize: false
		},
		experiments: {
			outputModule: true
		}
	},
	{
		// `node-commonjs` path: electron built-ins are required
		target: "electron-main",
		optimization: {
			concatenateModules: false,
			minimize: false
		}
	}
];
