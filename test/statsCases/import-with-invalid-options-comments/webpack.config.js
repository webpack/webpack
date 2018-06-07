module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		chunkFilename: "[name].js"
	},
	stats: {
		timings: false,
		hash: false,
		entrypoints: false,
		assets: false,
		errorDetails: true,
		moduleTrace: true
	}
};
