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

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		entry: "./index-1.js",
		output: {
			publicPath: () => "/app/",
			chunkFilename: "[name].[contenthash].js",
			assetModuleFilename: "[name].[contenthash][ext][query]"
		},
		optimization: {
			chunkIds: "named"
		},
		plugins: [
			new CopyPlugin(),
			new webpack.ManifestPlugin({
				filename: "foo.json"
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
	},
	{
		target: "web",
		entry: {
			"nested-shared": {
				import: "./nested-shared.js"
			},
			shared: {
				dependOn: "nested-shared",
				import: "./shared.js?foo=bar"
			},
			foo: {
				dependOn: "shared",
				import: "./index-2.js"
			}
		},
		output: {
			publicPath: "auto",
			filename: "[name].js",
			chunkFilename: "[name].[contenthash].js",
			cssChunkFilename: "[name].[contenthash].css",
			assetModuleFilename: "[name].[contenthash][ext][query]"
		},
		devtool: "source-map",
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
		},
		plugins: [
			new CopyPlugin(),
			new webpack.ManifestPlugin({
				filename: "other.json",
				filter(item) {
					if (/file-loader.png/.test(item.file)) {
						return false;
					}

					return true;
				},
				generate: (manifest) => {
					manifest.custom = "value";
					return manifest;
				},
				prefix: "/nested[publicpath]",
				serialize: (manifest) => JSON.stringify(manifest)
			})
		],
		experiments: {
			css: true
		},
		optimization: {
			chunkIds: "named",
			splitChunks: {
				cacheGroups: {
					commons: {
						enforce: true,
						test: /dependency\.js$/,
						chunks: "initial"
					}
				}
			},
			runtimeChunk: { name: (entrypoint) => `runtime~${entrypoint.name}` }
		}
	}
];
