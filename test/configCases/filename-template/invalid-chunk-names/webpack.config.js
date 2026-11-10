"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "node",
		entry: "./node.js",
		output: {
			filename: "node/main.js",
			chunkFilename: "node/[name].[contenthash].js"
		},
		optimization: { minimize: false }
	},
	{
		target: "web",
		entry: {
			main: "./web.js",
			"styles?query": "./style.css",
			"styles#fragment": "./style.css",
			"mixed?query": ["./value.js", "./style.css"]
		},
		output: {
			filename: "web/js/[name].js",
			cssFilename: "web/css/[name].css"
		},
		experiments: { css: true },
		optimization: { minimize: false, splitChunks: false },
		plugins: [
			/**
			 * Exercises chunks without assets and repeated sealing.
			 * @param {import("../../../../").Compiler} compiler compiler
			 */
			(compiler) => {
				compiler.hooks.compilation.tap("test", (compilation) => {
					compilation.hooks.afterOptimizeChunks.tap("test", () => {
						compilation.addChunk("empty?query");
					});
					let resealed = false;
					compilation.hooks.needAdditionalSeal.tap("test", () => {
						if (!resealed) {
							resealed = true;
							return true;
						}
					});
				});
			}
		]
	}
];
