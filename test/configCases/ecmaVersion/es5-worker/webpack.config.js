"use strict";

// A worker chunk and an asset URL both come out of `new URL(…, import.meta.url)`,
// which webpack rewrites — the emitted form has to stay es5.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	module: {
		rules: [{ test: /\.txt$/, type: "asset/resource" }]
	}
};
