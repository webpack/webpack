module.exports = {
	mode: "production",
	entry: {
		"entry-1": "./entry-1"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			minSize: 0,
			chunks: "all",
			cacheGroups: {
				"vendor-1": /modules[\\/][abc]/
			}
		}
	}
};
