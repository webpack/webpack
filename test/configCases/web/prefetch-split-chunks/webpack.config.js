/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js",
		chunkFilename: "[name].js",
		crossOriginLoading: "anonymous"
	},
	performance: {
		hints: false
	},
	optimization: {
		minimize: false,
		chunkIds: "named",
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
