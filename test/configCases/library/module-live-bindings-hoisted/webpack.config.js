"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ concatenateModules: false, minimize: false },
	{ concatenateModules: true, minimize: false },
	{
		concatenateModules: true,
		minimize: true,
		// A minifier keeps the name a function took from its binding only when asked
		minimizer: [
			new MinimizerPlugin({
				minify: require.resolve("../../../../lib/javascript/jsMinify"),
				minimizerOptions: { keep_fnames: true }
			})
		]
	}
].map((optimization, index) => ({
	target: "node14",
	entry: {
		main: "./index.js",
		library: { import: "./library.js", library: { type: "module" } }
	},
	output: { module: true, filename: `[name]-${index}.mjs` },
	externalsType: "module",
	externals: {
		"./library.mjs": `./library-${index}.mjs`,
		"external-counter": "var counter"
	},
	plugins: [
		new webpack.DefinePlugin({
			GLOBAL_COUNTER: "counter",
			MINIFIED: JSON.stringify(Boolean(optimization.minimize))
		})
	],
	optimization
}));
