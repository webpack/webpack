"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const jsMinify = require("../../../../lib/javascript/jsMinify");

/** @type {import("terser").MinifyOptions[]} */
const minimizerOptions = [
	{ compress: { passes: 2 }, mangle: false },
	{},
	{ format: { keep_quoted_props: true } },
	{ compress: { side_effects: false } }
];

/** @type {import("../../../../").Configuration[]} */
module.exports = minimizerOptions.map((options, index) => ({
	mode: "production",
	target: ["web", "es2022"],
	experiments: { futureDefaults: true },
	output: { filename: `bundle${index}.js`, module: false },
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({
				// Keep coverage counters in the process running the tests.
				parallel: false,
				minify: jsMinify,
				minimizerOptions: options
			})
		]
	}
}));
