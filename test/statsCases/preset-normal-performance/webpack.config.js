module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	performance: {
		hints: "warning"
	},
	stats: {
		hash: false,
		colors: true
	}
};
