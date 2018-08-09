module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		orphanModules: true,
		nestedModules: true,
		usedExports: true,
		reasons: true
	}
};
