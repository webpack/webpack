"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "bundle0.[contenthash:1].js",
		chunkFilename: "[name].[contenthash:1].js"
	},
	optimization: { realContentHash: true }
};
