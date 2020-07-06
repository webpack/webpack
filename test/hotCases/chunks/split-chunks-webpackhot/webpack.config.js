module.exports = {
	output: {
		filename: "[name].js"
	},
	optimization: {
		chunkIds: "total-size",
		splitChunks: {
			chunks: "all",
			minSize: 0
		}
	}
};
