"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../lib/html/htmlMinify");

// Answers asynchronously with markup, as a real SVG minifier does — the whole
// subtree is deferred, so the print holds a marker where it stood.
/** @type {import("../../../../lib/html/htmlMinify").AsyncEmbeddedSourceRenderer} */
const renderEmbeddedSource = async (source, { type }) => {
	await Promise.resolve();
	return type === "svg" ? source.replace(/\s+/g, " ").trim() : undefined;
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: { filename: "[name].js", pathinfo: false },
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false } }
	},
	optimization: {
		minimize: true,
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.html(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run.
						parallel: false,
						minify: [htmlMinify],
						minimizerOptions: [{ renderEmbeddedSource }]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: { html: true }
};
