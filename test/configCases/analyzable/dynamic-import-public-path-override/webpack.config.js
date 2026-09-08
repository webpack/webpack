"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	devtool: false,
	output: {
		module: true,
		publicPath: "https://cdn.example.com/assets/",
		chunkFilename: "[name].mjs"
	}
};
