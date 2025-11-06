"use strict";

/** @typedef {import("../../../../").GeneratorOptionsByModuleTypeKnown} GeneratorOptionsByModuleTypeKnown */

/** @type {import("../../../../").Configuration} */

/**
 * @param {object} options Configuration options
 * @param {boolean=} options.concatenateModules Whether to concatenate modules
 * @returns {import("../../../../").Configuration} Webpack configuration
 */
const getConfig = ({ concatenateModules } = { concatenateModules: false }) => ({
	devtool: false,
	target: "web",
	mode: "development",
	optimization: {
		chunkIds: "named",
		concatenateModules
	},
	module: {
		rules: [
			{
				test: /module-text\.css$/,
				type: "css/module"
			},
			{
				test: /auto-text\.css$/,
				type: "css/auto"
			},
			{
				test: /module-text-no-esm\.css$/,
				type: "css/module",
				generator: {
					esModule: false
				},
				parser: {
					namedExports: false
				}
			},
			{
				test: /auto-text-no-esm\.css$/,
				type: "css/auto",
				generator: {
					esModule: false
				},
				parser: {
					namedExports: false
				}
			},
			{
				test: /module-with-imports\.css$/,
				type: "css/module"
			},
			{
				test: /imported-(base|layer)\.css$/,
				type: "css/module"
			},
			{
				test: /parent-module-with-imports\.css$/,
				type: "css/module"
			},
			{
				test: /stylesheet\.css$/,
				type: "css/auto",
				parser: {
					exportType: "css-style-sheet"
				}
			},
			{
				test: /module-stylesheet\.css$/,
				type: "css/module",
				parser: {
					exportType: "css-style-sheet"
				}
			}
		],
		parser: {
			css: {
				import: true,
				exportType: "text"
			}
		}
	},
	experiments: {
		css: true
	}
});

module.exports = [getConfig(), getConfig({ concatenateModules: true })];
