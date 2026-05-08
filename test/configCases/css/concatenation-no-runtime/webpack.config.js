"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */

/** @type {("text" | "css-style-sheet" | "style" | "link")[]} */
const exportTypes = ["text", "css-style-sheet", "style", "link"];

/**
 * @param {(typeof exportTypes)[number]} exportType the css module exportType
 * @returns {Configuration} a single config that builds an isolated bundle
 */
const makeConfig = (exportType) => ({
	target: "web",
	mode: "production",
	devtool: false,
	entry: `./index-${exportType}.js`,
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		chunkIds: "named"
	},
	// Keep __dirname/__filename as-is so the test code can read the
	// emitted bundle from disk via Node's native handling under the
	// jest test runner.
	node: {
		__dirname: false,
		__filename: false
	},
	module: {
		// Each entry only imports its own type's fixtures, so a single
		// rule applying the export type for all matched .css files
		// suffices.
		rules: [
			{
				test: /\.css$/,
				type: "css/auto",
				parser: { exportType }
			}
		]
	},
	experiments: {
		css: true
	}
});

module.exports = exportTypes.map(makeConfig);
