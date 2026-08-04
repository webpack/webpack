"use strict";

const fs = require("fs");
const path = require("path");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const { Compilation, sources } = require("../../../../");
const htmlMinify = require("../../../../lib/html/htmlMinify");

// webpack's own HTML modules extract every inline `<script>` into a `.js` asset,
// so the bodies this minifies belong to HTML webpack only passes through — what
// html-webpack-plugin and copy-webpack-plugin emit. Emitting the asset directly
// is that path.
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
		// The default minimizer is replaced by the test harness, so wire the HTML
		// minify function into one minimizer plugin the same way the production
		// default does (lib/config/defaults.js): an array of minify functions, each
		// routed by its own `filter`, in a single instance / worker pool.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|html)(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run:
						// the worker pool is another process and reports nothing.
						parallel: false,
						minify: [MinimizerPlugin.terserMinify, htmlMinify],
						// The same terser options both ways, as the production default
						// does: an inline `<script>` is minified like a `.js` asset.
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
