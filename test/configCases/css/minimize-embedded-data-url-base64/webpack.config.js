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
		// `url` / `import` off keeps a `data:` URL in the stylesheet rather than
		// making an asset module of it, where only the serializer reaches it.
		parser: { "css/auto": { url: false, import: false } }
	},
	optimization: {
		minimize: true,
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
