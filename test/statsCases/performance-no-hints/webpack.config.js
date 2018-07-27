module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		colors: true,
		hash: false,
		entrypoints: true
	},
	performance: {
		hints: false
	}
};
