"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		target: "node",
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
				import: "./foo.js"
			}
		},
		output: {
			publicPath: "auto",
			filename: "[name].js",
			chunkFilename: "[name].[contenthash].js",
			cssChunkFilename: "[name].[contenthash].css",
			assetModuleFilename: "[name].[contenthash][ext][query]",
			library: {
				type: "commonjs"
			}
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
