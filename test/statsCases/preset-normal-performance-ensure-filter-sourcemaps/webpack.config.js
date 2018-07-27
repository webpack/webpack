module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	devtool: "sourcemap",
	performance: {
		hints: "warning"
	},
	entry: "./index",
	stats: {
		hash: false,
		colors: true
	}
};
