"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	// one entry per corpus, so each is minified as its own stylesheet
	entry: {
		"escaped-property-names": "./escaped-property-names/index.js",
		"minimize-calc": "./minimize-calc/index.js",
		"minimize-calc-lightningcss": "./minimize-calc-lightningcss/index.js",
		"minimize-colors": "./minimize-colors/index.js",
		"minimize-cssnano-custom-properties":
			"./minimize-cssnano-custom-properties/index.js",
		"minimize-declined": "./minimize-declined/index.js",
		"minimize-empty-rules": "./minimize-empty-rules/index.js",
		"minimize-esbuild": "./minimize-esbuild/index.js",
		"minimize-lightningcss-selectors":
			"./minimize-lightningcss-selectors/index.js",
		"minimize-lightningcss-values": "./minimize-lightningcss-values/index.js",
		"minimize-media-queries": "./minimize-media-queries/index.js",
		"minimize-nesting": "./minimize-nesting/index.js",
		"minimize-omitted-values": "./minimize-omitted-values/index.js",
		"minimize-selectors": "./minimize-selectors/index.js",
		"minimize-shorthand-folds": "./minimize-shorthand-folds/index.js",
		"minimize-shorthands": "./minimize-shorthands/index.js",
		"minimize-supports": "./minimize-supports/index.js",
		"minimize-timing-functions": "./minimize-timing-functions/index.js",
		"minimize-urls": "./minimize-urls/index.js",
		"minimize-value-validity": "./minimize-value-validity/index.js",
		"minimize-values": "./minimize-values/index.js"
	},
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		// Mirror a real production build: no per-module pathinfo banners.
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// Same wiring as the production default (lib/config/defaults.js): one
		// minimizer plugin holding both minify functions, each routed by its filter.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						extractComments: false,
						test: /\.(?:[cm]?js|css)(\?.*)?$/i,
						minify: [MinimizerPlugin.terserMinify, cssMinify],
						minimizerOptions: [{ compress: { passes: 2 } }, {}]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		css: true
	}
};
