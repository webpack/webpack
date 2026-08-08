"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const { Compilation, sources } = require("../../../../");
const htmlMinify = require("../../../../lib/html/htmlMinify");

// webpack's own HTML modules extract every inline `<script>` into a `.js` asset,
// so the bodies this minifies belong to HTML webpack only passes through.
const emitPage = {
	/**
	 * @param {import("../../../../").Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("EmitPage", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "EmitPage",
					stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"page.html",
						new sources.RawSource(
							fs.readFileSync(path.join(__dirname, "page.html"), "utf8")
						)
					);
				}
			);
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	plugins: [emitPage],
	optimization: {
		minimize: true,
		// The harness replaces the default minimizer, so wire it the way
		// lib/config/defaults.js does: one plugin, one minify function per type.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						parallel: false,
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						minimizerOptions: [
							{ compress: { passes: 2 } },
							{ terserOptions: { compress: { passes: 2 } } }
						]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	}
};
