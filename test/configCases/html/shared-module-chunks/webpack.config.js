"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((includeJavaScript) => {
	const name = includeJavaScript ? "mixed" : "virtual";
	return {
		mode: "production",
		target: "web",
		entry: { [name]: "./entry.js" },
		experiments: { html: true },
		output: {
			filename: "[name].[contenthash].js",
			htmlFilename: `${name}.html`,
			publicPath: "",
			crossOriginLoading: "anonymous",
			html: { integrity: true }
		},
		optimization: {
			minimize: false,
			runtimeChunk: { name: `${name}-runtime` },
			splitChunks: {
				cacheGroups: {
					shared: {
						/**
						 * @param {import("../../../../").Module} module module
						 * @returns {boolean} whether the module belongs to the shared chunk
						 */
						test: (module) =>
							module.type === "consume-shared-module" ||
							(includeJavaScript &&
								module.nameForCondition() ===
									path.join(__dirname, "vendor.js")),
						chunks: "all",
						enforce: true,
						name: `${name}-shared`
					}
				}
			}
		},
		plugins: [
			new webpack.container.ModuleFederationPlugin({
				name,
				shared: {
					"./first": { eager: true, requiredVersion: false },
					"./second": { eager: true, requiredVersion: false }
				}
			}),
			{
				/**
				 * @param {import("../../../../").Compiler} compiler compiler
				 * @returns {void}
				 */
				apply(compiler) {
					compiler.hooks.afterEmit.tap("CheckSharedChunks", (compilation) => {
						const chunk = /** @type {import("../../../../").Chunk} */ (
							compilation.namedChunks.get(`${name}-shared`)
						);
						expect(chunk).toBeDefined();
						expect(chunk.files.size).toBe(includeJavaScript ? 1 : 0);
						expect(compilation.chunkGraph.getNumberOfChunkModules(chunk)).toBe(
							includeJavaScript ? 3 : 2
						);
					});
					compiler.hooks.thisCompilation.tap("CopyTest", (compilation) => {
						compilation.hooks.processAssets.tap(
							{
								name: "CopyTest",
								stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
							},
							() => {
								compilation.emitAsset(
									"test.js",
									new webpack.sources.RawSource(
										fs.readFileSync(path.join(__dirname, "test.js"))
									)
								);
							}
						);
					});
				}
			}
		]
	};
});
