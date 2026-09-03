"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const htmlMinify = require("../../../../lib/html/htmlMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		rules: [
			{
				// Emitted verbatim rather than parsed: the html parser bundles an
				// executable inline `<script>` into its own entry, so a page that is
				// a module never reaches the minifier holding one.
				test: /\.html$/i,
				type: "asset/resource",
				generator: { filename: "page.html" }
			}
		]
	},
	optimization: {
		minimize: true,
		// Only the HTML minifier, so no renderer answers for an inline script and
		// the body is left to the trim.
		minimizer: [
			{
				apply: (compiler) => {
					new MinimizerPlugin({
						test: /\.html(\?.*)?$/i,
						// In-process, so the coverage instrument sees the minify run:
						// the worker pool is another process and reports nothing.
						parallel: false,
						minify: [htmlMinify],
						minimizerOptions: [{ collapseWhitespace: true }]
					}).apply(/** @type {EXPECTED_ANY} */ (compiler));
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
