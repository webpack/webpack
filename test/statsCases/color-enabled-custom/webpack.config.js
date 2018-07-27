module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	stats: {
		colors: {
			yellow: "\u001b[33m",
			green: "\u001b[32m"
		}
	}
};
