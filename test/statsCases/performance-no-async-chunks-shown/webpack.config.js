module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: {
		main: "./index",
		sec: "./index2"
	},
	performance: {
		hints: "warning"
	},
	stats: {
		colors: true,
		hash: false,
		entrypoints: true
	}
};
