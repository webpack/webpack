"use strict";

// A lazy context loads a chunk per request. Under module output the loader is written
// into the map next to the request it serves, so the pair reads as one object.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name) => ({
	name,
	target: "node",
	mode: "development",
	devtool: false,
	entry: { [name]: `./${name}-entry.js` },
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", splitChunks: false },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: `${name}-[name].mjs`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// One chunk per request, so the loader is reached without a `Promise.all`.
	base(0, "plain"),
	// A split chunk gives every request two, so each is loaded through its own thunk.
	{
		...base(1, "split"),
		optimization: {
			chunkIds: "named",
			splitChunks: {
				cacheGroups: {
					shared: {
						test: /shared-lib/,
						chunks: "all",
						name: "shared",
						enforce: true
					}
				}
			}
		}
	},
	// Mixed exports types add a fake-map slot, moving the loaders one position along.
	base(2, "fake"),
	// A deferred context adds a trailing slot an async candidate leaves empty.
	{
		...base(3, "defer"),
		experiments: { outputModule: true, deferImport: true, topLevelAwait: true }
	}
];
