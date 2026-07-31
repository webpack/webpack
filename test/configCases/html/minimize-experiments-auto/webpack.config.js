"use strict";

const { sources } = require("../../../../");

// Stands in for the plugins that emit HTML webpack never rendered itself
// (copy-webpack-plugin, html-webpack-plugin, …). `already.html` arrives flagged
// `minimized`, the way every minimizer built on `minimizer-webpack-plugin`
// marks what it has handled.
class EmitOtherHtmlAssetsPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"EmitOtherHtmlAssetsPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "EmitOtherHtmlAssetsPlugin",
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						// Record what the `"auto"` resolution settled on so the test can
						// assert which `lib/config/defaults.js` branch ran.
						compilation.emitAsset(
							"experiments.txt",
							new sources.RawSource(
								JSON.stringify(compiler.options.experiments.html)
							)
						);
						compilation.emitAsset(
							"copied.html",
							new sources.RawSource(
								"<!DOCTYPE html>\n<html><body>\n<!-- drop me -->\n<div><%= title %></div>\n</body></html>\n"
							)
						);
						compilation.emitAsset(
							"already.html",
							new sources.RawSource(
								"<!DOCTYPE html>\n<html><body>\n<!-- keep me -->\n</body></html>\n"
							),
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
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	optimization: {
		minimize: true,
		// `"..."` expands to webpack's own default minimizer, so this drives the
		// real `lib/config/defaults.js` wiring rather than a hand-built one.
		minimizer: ["..."]
	},
	plugins: [new EmitOtherHtmlAssetsPlugin()]
};
