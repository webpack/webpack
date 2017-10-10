module.exports = {
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	stats: {
		hash: false,
		timings: false,
		assets: false,
		chunks: true,
		chunkModules: true,
		modules: false
	}
};
