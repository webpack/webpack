"use strict";

const webpack = require("../../../../");

class MyCssMinimizerPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("MyCssMinimizerPlugin", (compilation) => {
			compilation.hooks.processContent
				.for("css")
				.tapPromise("MyCssMinimizerPlugin", async ([content, sourceMap]) => [
					content.replace(/rgba\(255,\s*0,\s*0,\s*1\)/g, "red"),
					sourceMap
				]);
		});
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
