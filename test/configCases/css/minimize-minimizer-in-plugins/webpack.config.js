"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	optimization: {
		minimize: true,
		minimizer: ["..."]
	},
	// A minimizer belongs in `optimization.minimizer`, but it works from
	// `plugins` too and is often put there. It claims CSS only, so HTML is still
	// webpack's to minify.
	plugins: [
		new MinimizerPlugin({
			test: /\.css$/i,
			minify: (input) => ({ code: `/*user*/${Object.values(input)[0]}` }),
			minimizerOptions: {}
		})
	],
	experiments: {
		css: true,
		html: true
	}
};
