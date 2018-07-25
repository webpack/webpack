module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		nestedModules: true,
		usedExports: true,
		reasons: true
	}
};
