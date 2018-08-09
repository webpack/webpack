module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		all: false,
		modules: true,
		nestedModules: true,
		orphanModules: true,
		optimizationBailout: true
	}
};
