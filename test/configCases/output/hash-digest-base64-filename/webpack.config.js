"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		chunkFilename: "[name].[contenthash:8].js",
		hashDigest: "base64"
	}
};
