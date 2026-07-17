"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		// CommonJS output: packages are externalized via `require()`.
		target: "node",
		externalsPresets: { nodeModules: true },
		resolve: {
			alias: {
				"aliased-pkg$": path.resolve(__dirname, "aliased.js")
			}
		}
	},
	{
		// Module output: packages are externalized via `import`.
		target: "node",
		entry: "./module.mjs",
		output: { module: true },
		experiments: { outputModule: true },
		externalsPresets: { nodeModules: true }
	}
];
