module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	profile: true,
	stats: {
		reasons: true,
		chunkModules: true,
		chunkOrigins: true,
		modules: true,
		cached: true,
		cachedAssets: true,
		source: true,
		errorDetails: true,
		publicPath: true,
		outputPath: true
	}
};
