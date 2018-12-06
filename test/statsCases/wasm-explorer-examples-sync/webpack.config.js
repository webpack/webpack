module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			minSize: {},
			maxSize: {
				webassembly: 500
			}
		}
	},
	stats: {
		chunks: true,
		chunkModules: true,
		modules: true
	}
};
