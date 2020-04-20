/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		constructor: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		runtimeChunk: "single",
		chunkIds: "named"
	}
};
