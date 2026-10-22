"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		entryA: "./a",
		entryB: "./b"
	},
	output: {
		filename: "[name].js"
	},
	module: {
		rules: [
			{
				test: /a\.js$/,
				loader: "./warning-loader"
			}
		]
	},
	ignoreWarnings: [/__mocked__warning__/],
	stats: {
		all: false,
		errorsCount: true,
		warningsCount: true
	}
};
