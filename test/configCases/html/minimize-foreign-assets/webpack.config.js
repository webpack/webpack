"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const { sources } = require("../../../../");
const htmlMinify = require("../../../../lib/html/htmlMinify");

// A stand-in for the plugins that emit HTML webpack's own pipeline never
// rendered (html-webpack-plugin, copy-webpack-plugin, …).
class EmitForeignHtmlPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"EmitForeignHtmlPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "EmitForeignHtmlPlugin",
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						compilation.emitAsset(
							"foreign.html",
							new sources.RawSource(
								"<!DOCTYPE html>\n<html>\n  <body>\n    <div>   <%= title %>   </div>\n  </body>\n</html>\n"
							)
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
		// Wired exactly like the production default (lib/config/defaults.js).
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	plugins: [new EmitForeignHtmlPlugin()],
	// `"auto"` (the default) resolves the same way — the marker rides on the
	// rendered asset, not on how the experiment was enabled.
	experiments: {
		html: true
	}
};
