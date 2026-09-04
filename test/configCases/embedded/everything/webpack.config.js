"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const cssMinify = require("../../../../lib/css/cssMinify");
const htmlMinify = require("../../../../lib/html/htmlMinify");
const svgMinify = require("../../../helpers/svgMinify");

/**
 * @typedef {import("minimizer-webpack-plugin").BasicMinimizerImplementation<EXPECTED_ANY> & import("minimizer-webpack-plugin").MinimizeFunctionHelpers} Minifier
 */

/**
 * Every language a nested body can be written in, so whatever a host hands
 * over reaches something that minifies it.
 * @type {Minifier[]}
 */
const MINIFIERS = [
	MinimizerPlugin.terserMinify,
	cssMinify,
	htmlMinify,
	MinimizerPlugin.jsonMinify,
	svgMinify
];

/**
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
				// rather than making an asset module of it.
				{
					test: /sheet-.*\.css$/,
					type: "css/auto",
					parser: { url: false, import: false }
				},
				// `link` is the default, and the one export type whose stylesheet
				// stays a css asset instead of reaching the javascript bundle.
				{ test: /sheet-asset\.css$/, parser: { exportType: "link" } },
				{ test: /sheet-text\.css$/, parser: { exportType: "text" } },
				{ test: /source\.(?:css|html|js|json|svg)$/, type: "asset/source" },
				{ test: /inline\.(?:css|html|js|json|svg)$/, type: "asset/inline" }
			]
		},
		optimization: {
			minimize: true,
			minimizer: [minimizer(MINIFIERS)]
		},
		experiments: { css: true, html: true }
	},
	{
		// No document here, so `css-style-sheet` falls back to an object carrying
		// the stylesheet text as written rather than one a parser reassembled.
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
				{ test: /sheet-sheet\.css$/, parser: { exportType: "css-style-sheet" } }
			]
		},
		optimization: {
			minimize: true,
			minimizer: [minimizer(MINIFIERS)]
		},
		experiments: { css: true }
	},
	{
		// `style` injects into a document, so this one is built for the web.
		target: "web",
		mode: "production",
		entry: { styles: "./style-export.js" },
		output: { pathinfo: false, filename: "[name].js" },
		module: {
			rules: [
				{
					test: /sheet-.*\.css$/,
					type: "css/auto",
					parser: { url: false, import: false }
				},
				{ test: /sheet-style\.css$/, parser: { exportType: "style" } }
			]
		},
		optimization: {
			minimize: true,
			minimizer: [minimizer(MINIFIERS)]
		},
		experiments: { css: true }
	}
];
