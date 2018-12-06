module.exports = {
	mode: "development",
	entry: "./index.js",
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: false
	},
	stats: {
		all: false,
		chunks: true,
		chunkRootModules: true
	}
};
