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
		// One instance covering both types — the shape a project already using
		// `minimizer-webpack-plugin` for CSS and HTML has. Webpack adds neither of
		// its built-in minifiers.
		minimizer: [
			"...",
			new MinimizerPlugin({
				test: /\.(css|html)$/i,
				minify: (input) => {
					const [[name, code]] = Object.entries(input);

					return {
						code: `${name.endsWith(".css") ? "/*u*/" : "<!--u-->"}${code}`
					};
				},
				minimizerOptions: {}
			})
		]
	},
	// Nothing to claim, but it follows the minimizer that already claimed both
	// types — the scan must stop rather than keep probing.
	plugins: [
		{
			apply() {}
		}
	],
	experiments: {
		css: true,
		html: true
	}
};
