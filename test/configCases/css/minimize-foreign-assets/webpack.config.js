"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const { sources } = require("../../../../");
const cssMinify = require("../../../../lib/css/cssMinify");

// A stand-in for the plugins that emit CSS webpack's own pipeline never
// rendered (mini-css-extract-plugin, copy-webpack-plugin, …).
class EmitForeignCssPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"EmitForeignCssPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "EmitForeignCssPlugin",
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						compilation.emitAsset(
							"foreign.css",
							new sources.RawSource(".foreign {\n\tcolor : red ;\n}\n")
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
		// Wired exactly like the production default (lib/config/defaults.js).
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	plugins: [new EmitForeignCssPlugin()],
	// `"auto"` (the default) resolves the same way — the marker rides on the
	// rendered asset, not on how the experiment was enabled.
	experiments: {
		css: true
	}
};
