module.exports = {
	mode: "development",
	entry: {
		main: "./index"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].bundle.js",
		jsonpFunction: "_load_chunk"
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				async: {
					chunks: "async",
					reuseExistingChunk: true,
					minSize: 1,
					maxSize: 1
				}
			}
		}
	}
};
