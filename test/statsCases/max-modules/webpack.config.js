module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	performance: false,
	stats: {
		maxModules: 20
	}
};
