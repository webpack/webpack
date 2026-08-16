"use strict";

// `startupEntrypoint` is the helper that runs an entry module behind a chunk load, and
// a separate runtime chunk is the only shape that can ask for it. Whether it is called
// is decided by the startup render, long after runtime requirements close, so the
// requirement mirrors that decision rather than assuming it.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so `index.js` finds its own stats
 * @param {string} name output sub-directory keeping the two configs apart
 * @param {boolean} awaited whether the entry runs behind another initial chunk
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, awaited) => ({
	mode: "development",
	devtool: false,
	// Sync chunk loading: the sibling lands before the entry runs, so the harness
	// sees no load outliving it.
	target: "node",
	entry: "./index.js",
	output: {
		filename: `${name}/[name].js`,
		chunkFilename: `${name}/[name].js`
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: "single",
		// An initial sibling in the entrypoint is what the entry has to wait for.
		splitChunks: awaited && {
			cacheGroups: {
				sibling: {
					test: /sibling\.js$/,
					name: "sibling",
					chunks: "initial",
					enforce: true
				}
			}
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name),
			__AWAITED__: JSON.stringify(awaited)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// Nothing to wait for: the entry module is called straight.
	base(0, "straight", false),
	// An initial sibling chunk has to land first, so the helper is called.
	base(1, "awaited", true)
];
