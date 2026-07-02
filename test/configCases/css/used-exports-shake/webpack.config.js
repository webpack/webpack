"use strict";

/** @typedef {import("../../../../").Configuration} Configuration */

/**
 * @param {boolean} concatenateModules whether module concatenation is enabled
 * @param {string} entry entry file
 * @returns {Configuration} webpack config
 */
const makeConfig = (concatenateModules, entry = "./index.js") => ({
	entry,
	target: "web",
	mode: "production",
	devtool: false,
	experiments: { css: true },
	output: {
		cssFilename: "bundle0.css"
	},
	optimization: {
		usedExports: true,
		mangleExports: false,
		concatenateModules,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	module: {
		rules: [
			{
				test: /text-shake\.module\.css$/,
				type: "css/module",
				parser: {
					exportType: "text"
				}
			}
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
});

module.exports = [
	makeConfig(false),
	makeConfig(true),
	makeConfig(false, "./index-default-only.js"),
	makeConfig(false, "./index-named-only.js")
];
