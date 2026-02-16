"use strict";

/** @typedef {import("../../../../").Module} Module */

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: {
		app: "./app.js",
		"my-worker": "./worker.js"
	},
	output: {
		filename: "[name].js"
	},
	environment: {
		nodePrefixForCoreModules: false
	},
	optimization: {
		runtimeChunk: { name: "runtime" },
		splitChunks: {
			cacheGroups: {
				vendor: {
					/**
					 * @param {Module} mod module
					 * @returns {string | boolean | null} result
					 */
					test(mod) {
						return mod.context && mod.context.includes("node_modules");
					},
					chunks: "all",
					name: "vendor",
					priority: 10,
					enforce: true
				}
			}
		}
	}
};
