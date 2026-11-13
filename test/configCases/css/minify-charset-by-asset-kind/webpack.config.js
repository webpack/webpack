"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");
const xmlStyleMinify = require("./xmlStyleMinify");

const { cssMinify } = webpack.css;
const { htmlMinify } = webpack.html;

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "production",
		entry: "./index.js",
		output: { pathinfo: false, cssFilename: "bundle0.style" },
		optimization: {
			minimize: true,
			minimizer: [
				{
					apply: (compiler) => {
						// `cssMinify.filter` claims `.css` names only, so this widens it.
						new MinimizerPlugin({
							extractComments: false,
							test: /\.style$/,
							minify: {
								implementation: cssMinify,
								filter: (/** @type {string} */ name) => /\.style$/.test(name)
							}
						}).apply(/** @type {EXPECTED_ANY} */ (compiler));
					}
				}
			]
		},
		experiments: { css: true }
	},
	{
		target: "web",
		mode: "production",
		entry: "./embeds.js",
		output: { pathinfo: false },
		// Off, so each `data:` URL stays in the stylesheet for the minimizer to reach.
		module: { parser: { "css/auto": { url: false } } },
		optimization: {
			minimize: true,
			minimizer: [
				{
					apply: (compiler) => {
						new MinimizerPlugin({
							extractComments: false,
							parallel: false,
							test: /\.css$/,
							minify: [cssMinify, htmlMinify, xmlStyleMinify],
							minimizerOptions: [{}, {}, {}]
						}).apply(/** @type {EXPECTED_ANY} */ (compiler));
					}
				}
			]
		},
		experiments: { css: true }
	}
];
