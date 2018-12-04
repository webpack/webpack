module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural"
	},
	stats: {
		chunks: true,
		chunkModules: true,
		modules: true
	}
};
