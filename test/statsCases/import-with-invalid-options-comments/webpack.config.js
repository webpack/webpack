module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
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
