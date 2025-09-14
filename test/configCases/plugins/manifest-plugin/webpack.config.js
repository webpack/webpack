"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

/** @typedef {import("../../../../lib/Compiler")} Compiler */

class CopyPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hookOptions = {
			name: "MockCopyPlugin",
			stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
		};

		compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
			compilation.hooks.processAssets.tap(hookOptions, () => {
				const output = "// some compilation result\n";
				compilation.emitAsset("third.party.js", new RawSource(output));
			});
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		publicPath: "/app/",
		chunkFilename: "[name].[contenthash].js",
		assetModuleFilename: "[name].[contenthash][ext][query]"
	},
	plugins: [
		new CopyPlugin(),
		new webpack.experiments.ManifestPlugin({
			filename: "test.json"
		})
	],
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/resource"
			},
			{
				test: /\.png$/,
				loader: "file-loader",
				options: {
					name: "file-loader.[ext]"
				}
			}
		]
	}
};
