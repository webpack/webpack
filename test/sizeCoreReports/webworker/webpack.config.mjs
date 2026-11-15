/** @type {import("../../..").Configuration} */
export default {
	entry: "./generated/worker.js",
	target: "webworker",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].[contenthash].js"
	}
};
