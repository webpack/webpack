/** @type {import("../../..").Configuration} */
export default {
	entry: "./generated/worker.js",
	target: "webworker",
	output: {
		module: true,
		filename: "[name].mjs",
		chunkFilename: "[name].[contenthash].mjs"
	}
};
