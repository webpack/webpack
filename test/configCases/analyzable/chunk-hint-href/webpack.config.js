"use strict";

// Under module output a prefetch/preload href is written out, unless something about the
// public path is only known where the hint runs.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name) => ({
	name,
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	entry: { [name]: `./${name}-entry.js` },
	experiments: { outputModule: true },
	optimization: { chunkIds: "named", minimize: false },
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
	// The plain case. Both children hint at one shared chunk, so the same id is named
	// twice and has to be written out once.
	base(0, "auto"),
	// A content hash settles long after this code is generated, so the name is reserved
	// and filled in by the deferred pass.
	{
		...base(1, "hashed"),
		output: {
			...base(1, "hashed").output,
			chunkFilename: "hashed-[name].[contenthash].mjs"
		}
	},
	// Reassigned where the hint runs, so no literal can name where the chunk is and the
	// runtime form has to stay.
	base(2, "override"),
	// The hot handler hints at whatever id an update names, so a runtime carrying it
	// keeps the runtime form rather than a map that knows only today's ids.
	{
		...base(3, "hmr"),
		plugins: [
			.../** @type {NonNullable<import("../../../../").Configuration["plugins"]>} */ (
				base(3, "hmr").plugins
			),
			new webpack.HotModuleReplacementPlugin()
		]
	}
];
