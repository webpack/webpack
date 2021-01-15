/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		entry: "./entry"
	},
	optimization: {
		moduleIds: "named",
		chunkIds: "named",
		splitChunks: {
			cacheGroups: {
				vendor: {
					name: "vendor",
					test: /modules[\\/][ab]/,
					chunks: "all",
					enforce: true
				}
			}
		}
	}
};
