module.exports = {
	mode: "development",
	entry: "./index.js",
	optimization: {
		splitChunks: false
	},
	stats: {
		all: false,
		chunks: true,
		chunkRootModules: true
	}
};
