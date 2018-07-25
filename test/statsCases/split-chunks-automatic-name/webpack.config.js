const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
module.exports = {
	name: "production",
	mode: "production",
	entry: {
		main: "./"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			chunks: "all",
			minSize: 1,
			cacheGroups: {
				default: {
					automaticNamePrefix: "common",
					reuseExistingChunk: true,
					minChunks: 2,
					priority: -20
				},
				vendors: {
					automaticNamePrefix: "common",
					test: /[\\/]node_modules[\\/]/,
					priority: -10
				}
			}
		}
	},
	stats
};
