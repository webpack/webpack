"use strict";

const {
	util: {
		runtime: { runtimeToString }
	}
} = require("../../../../");

/** @import { Chunk, Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	target: "web",
	entry: {
		a: "./a.js",
		a2: "./a2.js",
		b: "./b.js",
		b2: "./b2.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		minimize: false,
		flagIncludedChunks: true,
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /shared\.js$/,
					chunks: "all",
					enforce: true,
					// one copy of shared.js is split out per runtime with the same used
					// exports, name each after its runtime so test.config.js can order them
					filename: ({ chunk }) =>
						`shared-${runtimeToString(/** @type {Chunk} */ (chunk).runtime)}.js`
				}
			}
		}
	}
};
