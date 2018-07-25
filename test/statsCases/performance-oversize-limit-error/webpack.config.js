module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: {
		main: "./index",
		sec: "./index2"
	},
	stats: {
		colors: true,
		hash: false,
		entrypoints: true
	},
	performance: {
		hints: "error"
	}
};
