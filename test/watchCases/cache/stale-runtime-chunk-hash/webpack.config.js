"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		bundle: "./index.js",
		entry2: { import: "./entry2.js", runtime: "runtime" }
	},
	mode: "production",
	cache: {
		type: "memory"
	},
	output: {
		filename: "[name].[contenthash].js",
		library: { type: "commonjs-module" }
	},
	optimization: {
		splitChunks: {
			minSize: 1,
			chunks: "all",
			cacheGroups: {
				shared: {
					test: /shared/,
					name: "shared",
					chunks: "all",
					enforce: true
				}
			}
		},
		minimize: false,
		concatenateModules: false
	}
};
