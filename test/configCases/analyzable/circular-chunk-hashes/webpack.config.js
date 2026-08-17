"use strict";

// Two chunks naming each other cannot both bake — each hash would feed the other. The
// lower id bakes and the other keeps the runtime form, so the hashes settle in order.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	experiments: { outputModule: true },
	output: {
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].[contenthash].mjs",
		publicPath: "auto"
	},
	optimization: { realContentHash: true, chunkIds: "named" }
};
