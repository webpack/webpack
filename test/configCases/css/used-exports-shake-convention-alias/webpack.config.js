"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */

/**
 * @param {boolean} concatenateModules whether module concatenation is enabled
 * @returns {Configuration} webpack config
 */
const makeConfig = (concatenateModules) => ({
	entry: "./index.js",
	target: "web",
	mode: "production",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				generator: {
					exportsConvention: "camel-case"
				}
			}
		]
	},
	optimization: {
		usedExports: true,
		mangleExports: false,
		concatenateModules,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	node: {
		__dirname: false,
		__filename: false
	}
});

module.exports = [makeConfig(false), makeConfig(true)];
