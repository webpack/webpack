"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		// `module-import` path: electron built-ins are imported as ESM
		target: "electron-main",
		entry: "./index.js",
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
		entry: "./require.js",
		optimization: {
			concatenateModules: false,
			minimize: false
		}
	}
];
