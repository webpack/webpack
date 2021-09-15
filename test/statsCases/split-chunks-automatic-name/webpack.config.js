const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkRelations: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
/** @type {import("../../../").Configuration} */
module.exports = {
	name: "production",
	mode: "production",
	entry: {
		main: "./"
	},
	optimization: {
		chunkIds: "named",
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				default: false,
				defaultVendors: false,
				a: {
					idHint: "common",
					reuseExistingChunk: true,
					minChunks: 2,
					enforce: true // minChunks should have higher priority
				},
				b: {
					idHint: "common",
					test: /[\\/]node_modules[\\/]/,
					minSize: 1,
					priority: 10
				}
			}
		}
	},
	stats
};
