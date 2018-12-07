module.exports = {
	mode: "development",
	entry: "./index.js",
	optimization: {
		moduleIds: "deterministic",
		chunkIds: "deterministic",
		splitChunks: false
	},
	stats: {
		all: false,
		chunks: true,
		chunkRootModules: true
	}
};
