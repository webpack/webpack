"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	// realContentHash would rehash in output.hashDigest; keep the inline digest
	optimization: { realContentHash: false },
	output: {
		// stored hash truncated to 8, so the inline length/digest must come from the
		// retained full content digest, not the truncated value
		hashDigestLength: 8,
		assetModuleFilename: "[name].[contenthash:hex:16][ext]"
	},
	module: {
		rules: [{ test: /\.bin$/, type: "asset/resource" }]
	}
};
