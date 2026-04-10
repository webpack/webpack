"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

class MyCssMinimizerPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 */
	apply(compiler) {
		const { matchObject } = compiler.webpack.ModuleFilenameHelpers;

		compiler.hooks.compilation.tap(
			"MyCssMinimizerPlugin",
			(/** @type {import("../../../../").Compilation} */ compilation) => {
				compilation.hooks.processContent.tapPromise(
					"MyCssMinimizerPlugin",
					async (
						/** @type {import("webpack-sources").Source} */ source,
						/** @type {string} */ name
					) => {
						if (matchObject({ test: /\.css$/ }, name)) {
							const content = source.source().toString();
							return new RawSource(
								content.replace(/rgba\(255,\s*0,\s*0,\s*1\)/g, "red")
							);
						}
						return source;
					}
				);
			}
		);
	}
}

/**
 * @param {string} exportType export type
 * @param {boolean=} concatenate whether to enable concatenateModules
 * @returns {import("../../../../").Configuration} webpack configuration
 */
function createConfig(exportType, concatenate) {
	return {
		name: concatenate ? `${exportType}-concatenated` : exportType,
		target: "web",
		mode: "development",
		devtool: false,
		module: {
			rules: [
				{
					test: /\.css$/,
					type: "css/module",
					parser: {
						exportType
					}
				}
			]
		},
		optimization: {
			concatenateModules: Boolean(concatenate)
		},
		experiments: {
			css: true
		},
		plugins: [
			new MyCssMinimizerPlugin(),
			new webpack.DefinePlugin({
				EXPORT_TYPE: JSON.stringify(exportType)
			})
		]
	};
}

module.exports = [
	createConfig("text"),
	createConfig("style"),
	createConfig("css-style-sheet"),
	createConfig("text", true)
];
