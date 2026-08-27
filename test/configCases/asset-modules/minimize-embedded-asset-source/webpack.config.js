"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const svgMinify = require("../../../helpers/svgMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { pathinfo: false },
	module: {
		rules: [
			{
				test: /\.(?:css|html|js|json|svg|txt)$/,
				issuer: /index\.js$/,
				type: "asset/source"
			}
		]
	},
	optimization: {
		minimize: true,
		// The default wiring plus the two languages it does not claim: JSON, and
		// SVG, which webpack ships no minifier for at all.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.(?:[cm]?js|css|html|json|svg)(\?.*)?$/i,
						minify: [
							MinimizerPlugin.terserMinify,
							cssMinify,
							htmlMinify,
							MinimizerPlugin.jsonMinify,
							svgMinify
						],
						minimizerOptions: [{ compress: { passes: 2 } }, {}, {}, {}, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { css: true, html: true }
};
