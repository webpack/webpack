"use strict";

const base = {
	target: ["web", "node"],
	entry: "./index.mjs",
	output: {
		publicPath: "",
		module: true,
		filename: "bundle0.mjs",
		chunkFilename: "[name].mjs",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{ name: "web", ...base },
	{ name: "node", ...base }
];
