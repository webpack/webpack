module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		reasons: false,
		modules: false,
		chunks: true,
		chunkModules: true,
		chunkOrigins: true
	}
};
