"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		module: true,
		filename: "[name].mjs"
	},
	target: ["web", "es2020"],
	optimization: {
		minimize: true,
		runtimeChunk: "single"
	}
};
