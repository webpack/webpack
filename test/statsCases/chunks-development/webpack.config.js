module.exports = {
	mode: "development",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	profile: true,
	stats: {
		reasons: true,
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		modules: false,
		publicPath: true
	}
};
