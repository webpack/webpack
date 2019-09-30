module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false,
		splitChunks: {
			cacheGroups: {
				separate: {
					enforce: true,
					chunks: "all",
					test: /public-path/
				}
			}
		},
		runtimeChunk: true
	}
};
