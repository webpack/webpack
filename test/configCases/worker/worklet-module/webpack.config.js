"use strict";

const { Compilation } = require("../../../../");

/** A module worklet must add its entry chunk directly: no bootstrap, no shim. */
class AssertNoBootstrapPlugin {
	/** @param {import("../../../../").Compiler} compiler compiler */
	apply(compiler) {
		compiler.hooks.compilation.tap("AssertNoBootstrap", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "AssertNoBootstrap",
					stage: Compilation.PROCESS_ASSETS_STAGE_REPORT
				},
				(assets) => {
					const main = assets["main.mjs"].source().toString();
					if (
						main.includes("worklet bootstrap") ||
						main.includes("importScripts")
					) {
						throw new Error("module worklet emitted a bootstrap/shim");
					}
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs"
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		// force VENDOR into a split chunk the worklet links via native `import`
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
	plugins: [new AssertNoBootstrapPlugin()],
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
