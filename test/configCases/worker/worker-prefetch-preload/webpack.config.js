"use strict";

const common = {
	mode: "development",
	target: "web",
	performance: {
		hints: false
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		name: "script",
		output: {
			filename: "[name].script.js",
			chunkFilename: "[name].script.js"
		}
	},
	{
		...common,
		name: "module",
		output: {
			filename: "[name].module.mjs",
			chunkFilename: "[name].module.mjs",
			module: true,
			workerChunkLoading: "import"
		},
		experiments: {
			outputModule: true
		}
	}
];
