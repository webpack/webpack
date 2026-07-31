"use strict";

const { sources } = require("../../../../");

// Stands in for the plugins that emit CSS webpack never rendered itself
// (copy-webpack-plugin, mini-css-extract-plugin, …). `already.css` arrives
// flagged `minimized`, the way every minimizer built on
// `minimizer-webpack-plugin` marks what it has handled.
class EmitOtherCssAssetsPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"EmitOtherCssAssetsPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "EmitOtherCssAssetsPlugin",
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						// Record what the `"auto"` resolution settled on so the test can
						// assert which `lib/config/defaults.js` branch ran.
						compilation.emitAsset(
							"experiments.txt",
							new sources.RawSource(
								JSON.stringify(compiler.options.experiments.css)
							)
						);
						compilation.emitAsset(
							"copied.css",
							new sources.RawSource(".copied {\n\tcolor : red ;\n}\n")
						);
						compilation.emitAsset(
							"already.css",
							new sources.RawSource(".already {\n\tcolor : red ;\n}\n"),
							{ minimized: true }
						);
					}
				);
			}
		);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` expands to webpack's own default minimizer, so this drives the
		// real `lib/config/defaults.js` wiring rather than a hand-built one.
		minimizer: ["..."]
	},
	plugins: [new EmitOtherCssAssetsPlugin()]
};
