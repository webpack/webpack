"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const svgMinify = require("../../../helpers/svgMinify");

/**
 * @typedef {import("minimizer-webpack-plugin").BasicMinimizerImplementation<EXPECTED_ANY> & import("minimizer-webpack-plugin").MinimizeFunctionHelpers} Minifier
 */
/**
 * One minimizer per language a nested body can be written in, so whatever a
 * host hands over reaches something that minifies it.
 * @param {Minifier[]} minify the minimizers
 * @returns {import("../../../../").WebpackPluginInstance} the plugin
 */
const minimizer = (minify) => ({
	apply: (compiler) => {
		new MinimizerPlugin({
			test: /\.(?:[cm]?js|css|html|json|svg)(\?.*)?$/i,
			// In-process, so the coverage instrument sees the minify run.
			parallel: false,
			minify,
			minimizerOptions: minify.map(() => ({}))
		}).apply(/** @type {EXPECTED_ANY} */ (compiler));
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "production",
		// One document per shape: one webpack parses as an entry, one it parses as
		// a module (index.js imports it), and one it only emits.
		entry: { main: "./index.js", page: "./page-entry.html" },
		output: {
			pathinfo: false,
			filename: "[name].js",
			htmlFilename: "[name].html",
			assetModuleFilename: "[name][ext]"
		},
		module: {
			rules: [
				{ test: /page-asset\.html$/, type: "asset/resource" },
				// `url` / `import` off keeps a `data:` payload in the stylesheet
				// rather than making an asset module of it, where only the
				// serializer reaches it.
				{
					test: /sheet-.*\.css$/,
					type: "css/auto",
					parser: { url: false, import: false }
				},
				{ test: /sheet-text\.css$/, parser: { exportType: "text" } },
				{ test: /source\.(?:css|html|js|json|svg)$/, type: "asset/source" },
				{ test: /inline\.(?:css|html|js|json|svg)$/, type: "asset/inline" }
			]
		},
		optimization: {
			minimize: true,
			minimizer: [
				minimizer([
					MinimizerPlugin.terserMinify,
					cssMinify,
					htmlMinify,
					MinimizerPlugin.jsonMinify,
					svgMinify
				])
			]
		},
		experiments: { css: true, html: true }
	},
	{
		// An export type that injects a stylesheet rather than exporting it needs a
		// runtime that works without a document, and that target emits no HTML
		// entry — so those two are built here instead.
		target: ["web", "node"],
		mode: "production",
		entry: { types: "./export-types.js" },
		output: { pathinfo: false, filename: "[name].js" },
		module: {
			rules: [
				{
					test: /sheet-.*\.css$/,
					type: "css/auto",
					parser: { url: false, import: false }
				},
				{ test: /sheet-style\.css$/, parser: { exportType: "style" } },
				{ test: /sheet-sheet\.css$/, parser: { exportType: "css-style-sheet" } }
			]
		},
		optimization: {
			minimize: true,
			minimizer: [minimizer([MinimizerPlugin.terserMinify, cssMinify])]
		},
		experiments: { css: true }
	}
];
