"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const { sources } = require("../../../../");

class EmitCopiedHtmlPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"EmitCopiedHtmlPlugin",
			(compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "EmitCopiedHtmlPlugin",
						stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
					},
					() => {
						compilation.emitAsset(
							"copied.html",
							new sources.RawSource(
								"<!DOCTYPE html>\n<html><body>\n<!-- keep me -->\n</body></html>\n"
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
		// `"..."` is webpack's own default minimizer; the entry after it already
		// claims `.html`, so webpack must not attach its built-in HTML minifier.
		minimizer: [
			"...",
			new MinimizerPlugin({
				test: /\.html$/i,
				minify: (input) => ({ code: `<!--user-->${Object.values(input)[0]}` }),
				minimizerOptions: {}
			})
		]
	},
	plugins: [new EmitCopiedHtmlPlugin()],
	experiments: {
		html: true
	}
};
