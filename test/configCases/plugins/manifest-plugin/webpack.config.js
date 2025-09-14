"use strict";

const { RawSource } = require("webpack-sources");
const webpack = require("../../../../");

class CopyPlugin {
	apply(compiler) {
		const hookOptions = {
			name: "MockCopyPlugin",
			stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS
		};
		const emit = (compilation, callback) => {
			const output = "// some compilation result\n";
			compilation.emitAsset("third.party.js", new RawSource(output));
			callback && callback(); // eslint-disable-line no-unused-expressions
		};

		compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
			compilation.hooks.processAssets.tap(hookOptions, () => emit(compilation));
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
