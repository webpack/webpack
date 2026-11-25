"use strict";

/** @import { Configuration } from "../../../../types" */

/**
 * @param {Configuration} config the config differences
 * @returns {Configuration} the config
 */
const base = (config) => ({
	mode: "production",
	target: "node",
	...config,
	optimization: {
		minimize: false,
		concatenateModules: { crossChunkImports: true },
		splitChunks: {
			cacheGroups: {
				shared: {
					test: /[\\/]shared[\\/]/,
					name: "shared",
					chunks: "async",
					minChunks: 2,
					minSize: 0,
					enforce: true
				}
			}
		}
	}
});

const esm = { module: true, chunkFormat: "module" };

/** @type {Configuration[]} */
module.exports = [
	// an eval devtool can't hold a native `export`
	base({
		devtool: "eval",
		output: {
			...esm,
			filename: "bundle0.mjs",
			chunkFilename: "[name].0.chunk.mjs"
		}
	}),
	// `futureDefaults` keeps a per-type devtool list as written
	base({
		experiments: { futureDefaults: true },
		devtool: [
			{ type: "css", use: "source-map" },
			{ type: "javascript", use: "eval-source-map" }
		],
		output: {
			...esm,
			filename: "bundle1.mjs",
			chunkFilename: "[name].1.chunk.mjs"
		}
	}),
	// chunks without native modules have nothing to link with
	base({
		output: { filename: "bundle2.js", chunkFilename: "[name].2.chunk.js" }
	})
];
