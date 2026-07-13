"use strict";

const { Compilation } = require("../../../../");

/**
 * A worklet chunk loads as a module, so its auto public-path reads
 * `import.meta.url` — never the worker-scope detection or the `importScripts`
 * shim in the bootstrap blob.
 */
class AssertImportMetaPublicPathPlugin {
	/** @param {import("../../../../").Compiler} compiler compiler */
	apply(compiler) {
		compiler.hooks.compilation.tap("AssertImportMeta", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "AssertImportMeta",
					stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				(assets) => {
					let workletUsesImportMeta = false;
					for (const name of Object.keys(assets)) {
						const source = assets[name].source().toString();
						if (source.includes("scriptUrl = import.meta.url")) {
							workletUsesImportMeta = true;
						}
						if (source.includes("importScripts is not available")) {
							throw new Error("worklet bootstrap still defines importScripts");
						}
					}
					if (!workletUsesImportMeta) {
						throw new Error("worklet chunk does not read import.meta.url");
					}
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	target: "web",
	plugins: [new AssertImportMetaPublicPathPlugin()],
	optimization: {
		// split an initial chunk out of the worklet and give the build a shared
		// runtime chunk — a worklet can load neither, so the bootstrap must
		// pre-add every chunk.
		runtimeChunk: "single",
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				vendor: {
					test: /vendor\.js$/,
					name: "vendor",
					enforce: true
				}
			}
		}
	},
	module: {
		rules: [
			{
				test: /\.[cm]?js$/,
				parser: {
					worklet: true
				}
			}
		]
	}
};
