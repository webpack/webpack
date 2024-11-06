module.exports = {
	target: ["node"],
	entry: {
		entry1: ["./entry1/index.js"],
		entry2: ["./entry2/index.js"],
		entry3: ["./entry3/index.js"]
	},
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		minimize: false,
		runtimeChunk: true,
		splitChunks: {
			chunks: "initial",
			cacheGroups: {
				pureFn: {
					test: /pure/,
					enforce: true,
					name: "chunk-reason-split-chunks"
				}
			}
		}
	}
};
