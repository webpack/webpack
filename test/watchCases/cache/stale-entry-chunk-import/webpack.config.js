"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: {
		main: "./index.js",
		other: { import: "./other.js", runtime: "runtime" }
	},
	cache: {
		type: "memory"
	},
	output: {
		module: true,
		filename: "[name].[contenthash].mjs"
	},
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				lib: {
					name: "lib",
					test: /lib\.js$/,
					chunks: "initial",
					enforce: true
				}
			}
		}
	}
};
