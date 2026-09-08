"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "web",
		output: {
			module: true,
			filename: "[name].mjs",
			library: {
				type: "module"
			}
		},
		target: ["web", "node"],
		optimization: {
			minimize: false,
			runtimeChunk: "single",
			splitChunks: {
				cacheGroups: {
					separate: {
						test: /separate/,
						chunks: "all",
						filename: "separate.mjs",
						enforce: true
					}
				}
			}
		},
		externals: {
			"external-self": "./main.mjs"
		}
	},
	{
		name: "node",
		output: {
			module: true,
			filename: "[name].mjs",
			library: {
				type: "module"
			}
		},
		target: ["web", "node"],
		optimization: {
			minimize: false,
			runtimeChunk: "single",
			splitChunks: {
				cacheGroups: {
					separate: {
						test: /separate/,
						chunks: "all",
						filename: "separate.mjs",
						enforce: true
					}
				}
			}
		},
		externals: {
			"external-self": "./main.mjs"
		}
	}
];
