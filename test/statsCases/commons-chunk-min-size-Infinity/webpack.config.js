module.exports = {
	mode: "production",
	entry: {
		"entry-1": "./entry-1"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			cacheGroups: {
				"vendor-1": {
					test: /modules[\\/][abc]/,
					chunks: "initial",
					name: "vendor-1",
					enforce: true
				}
			}
		}
	}
};
