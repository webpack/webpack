"use strict";

// A stylesheet is loaded by a `<link href>` the runtime builds from the chunk id. Under
// module output the file is known, so the href is written out — unless something about
// the public path can only be known where the chunk runs.

const webpack = require("../../../../");

/**
 * @param {number} index position of this config, so an entry finds its own stats
 * @param {string} name output prefix keeping the emitted files of each config apart
 * @param {boolean} baked whether the href is expected to be written out
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, name, baked) => ({
	name,
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	entry: { [name]: `./${name}-entry.js` },
	experiments: { outputModule: true, css: true },
	optimization: { chunkIds: "named" },
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: `${name}-[name].mjs`,
		cssChunkFilename: `${name}-[name].css`,
		publicPath: "auto"
	},
	plugins: [
		new webpack.DefinePlugin({
			__INDEX__: JSON.stringify(index),
			__NAME__: JSON.stringify(name),
			__BAKED__: JSON.stringify(baked)
		})
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	// The plain case: one lazy stylesheet under an `auto` public path.
	base(0, "auto", true),
	// A content hash settles long after this code is generated, so the name is reserved
	// and filled in by the deferred pass.
	{
		...base(1, "hashed", true),
		output: {
			...base(1, "hashed", true).output,
			cssChunkFilename: "hashed-[name].[contenthash].css"
		}
	},
	// Reassigned where the chunk runs, so no literal can name where the stylesheet is
	// and the runtime form has to stay.
	base(2, "override", false),
	// The hot handler re-loads by whatever id an update names, so a runtime carrying it
	// keeps the runtime form everywhere rather than a map that knows only today's ids.
	{
		...base(3, "hmr", false),
		plugins: [
			.../** @type {NonNullable<import("../../../../").Configuration["plugins"]>} */ (
				base(3, "hmr", false).plugins
			),
			new webpack.HotModuleReplacementPlugin()
		]
	}
];
