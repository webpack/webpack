"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		library: { type: "module" },
		publicPath: "auto",
		chunkFilename: "[name].mjs"
	}
};
