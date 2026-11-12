"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	output: {
		module: true,
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
