module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkRelations: true,
		chunkModules: true,
		modules: false
	}
};
