module.exports = {
	output: {
		filename: "[name].js"
	},
	target: "web",
	optimization: {
		chunkIds: "total-size",
		splitChunks: {
			chunks: "all",
			minSize: 0
		}
	}
};
