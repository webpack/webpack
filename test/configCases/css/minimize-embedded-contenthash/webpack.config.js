"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");

/**
 * Two builds alike but for one CSS minifier option, which rewrites `16px` to
 * `1pc` in the source this module embeds. Nothing else differs, so a
 * `[contenthash]` that did not follow the embedded source would name both the
 * same file.
 * @param {boolean} convertLengthUnits whether to convert the length
 * @returns {import("../../../../").Configuration} the configuration
 */
const config = (convertLengthUnits) => ({
	target: "node",
	mode: "production",
	output: {
		filename: `[contenthash]-${convertLengthUnits ? "on" : "off"}.js`,
		pathinfo: false
	},
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [
							{ compress: { passes: 2 } },
							{ convertLengthUnits }
						]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { css: true }
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [config(false), config(true)];
