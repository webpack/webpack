module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
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
	},
	experiments: {
		asyncWebAssembly: true,
		importAwait: true
	}
};
