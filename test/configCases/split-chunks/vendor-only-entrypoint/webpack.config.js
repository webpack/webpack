/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		vendor: "vendor"
	},
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		chunkIds: "named",
		runtimeChunk: true,
		splitChunks: {
			chunks: "all",
			minSize: 10,
			enforceSizeThreshold: 20
		}
	}
};
