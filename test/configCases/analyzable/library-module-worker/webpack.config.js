"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node"],
	mode: "development",
	devtool: false,
	experiments: {
		outputModule: true
	},
	output: {
		module: true,
		library: { type: "module" },
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
