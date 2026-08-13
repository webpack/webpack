"use strict";

// Two chunks that name each other cannot both take their name from their content —
// each hash would feed the other. Baking either literal makes RealContentHashPlugin
// throw `Circular hash dependency`, so the reference stays in the runtime form.

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
