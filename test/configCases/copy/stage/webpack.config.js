"use strict";

const { Compilation } = require("../../../../");

const PLUGIN_NAME = "RecordAssetsPlugin";

/**
 * Records which assets exist part-way through `processAssets`, which is the
 * only place the stage of the copy is observable.
 */
class RecordAssetsPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: PLUGIN_NAME,
					stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
				},
				() => {
					compilation.emitAsset(
						"seen-at-summarize.json",
						new compiler.webpack.sources.RawSource(
							JSON.stringify(compilation.getAssets().map((asset) => asset.name))
						)
					);
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		copy: {
			// after everything which optimizes an asset, so the copied file lands
			// on disk as it is
			stage: Compilation.PROCESS_ASSETS_STAGE_REPORT,
			patterns: [{ from: "files", to: "late" }]
		}
	},
	plugins: [new RecordAssetsPlugin()]
};
