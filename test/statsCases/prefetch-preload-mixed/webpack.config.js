module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		all: false,
		chunks: true
	}
};
