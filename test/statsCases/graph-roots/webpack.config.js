module.exports = {
	mode: "development",
	entry: "./index.js",
	optimization: {
		splitChunks: false
	},
	module: {
		asyncChunkMode: "lazy"
	},
	stats: {
		all: false,
		chunks: true,
		chunkRootModules: true
	}
};
