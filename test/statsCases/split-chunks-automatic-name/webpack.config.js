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
		splitChunks: {
			chunks: "all",
			cacheGroups: {
				default: {
					automaticNamePrefix: "common",
					reuseExistingChunk: true,
					minChunks: 2,
					priority: -20,
					enforce: true // minChunks should have higher priority
				},
				vendors: {
					automaticNamePrefix: "common",
					test: /[\\/]node_modules[\\/]/,
					minSize: 1,
					priority: -10
				}
			}
		}
	},
	stats
};
