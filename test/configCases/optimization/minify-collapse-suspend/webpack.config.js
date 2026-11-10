"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const jsMinify = require("../../../../lib/javascript/jsMinify");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: ["web", "es2018"],
	experiments: { futureDefaults: true },
	output: { filename: "bundle0.js", module: false },
	optimization: {
		minimize: true,
		minimizer: [
			new MinimizerPlugin({
				// Keep coverage counters in the process running the tests.
				parallel: false,
				minify: jsMinify,
				minimizerOptions: { compress: { passes: 2 }, mangle: false }
			})
		]
	}
};
