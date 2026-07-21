"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "production",
	devtool: false,
	experiments: {
		outputModule: true
	},
	optimization: {
		minimize: false,
		// realContentHash re-hashes assets from emitted content, renaming the chunk
		// after the placeholder substitution — the literal must track the rename.
		realContentHash: true,
		chunkIds: "named"
	},
	output: {
		module: true,
		publicPath: "auto",
		filename: "main.[contenthash].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
