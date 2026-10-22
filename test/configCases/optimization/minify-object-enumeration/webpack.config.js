"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const jsMinify = require("../../../../lib/javascript/jsMinify");

/** @type {import("../../../../").Configuration[]} */
module.exports = ["constants", "effects", "mutated"].map((name, index) => ({
	mode: "production",
	target: ["web", "es2018"],
	entry: `./${name}.js`,
	experiments: { futureDefaults: true },
	output: { filename: `bundle${index}.js`, module: false },
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({
				// Keep coverage counters in the process running the tests.
				parallel: false,
				minify: jsMinify,
				minimizerOptions: {
					ecma: 2018,
					mangle: false,
					compress: { passes: 2 },
					format: { ascii_only: true }
				}
			})
		]
	}
}));
