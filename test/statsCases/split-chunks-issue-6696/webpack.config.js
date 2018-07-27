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
	name: "default",
	mode: "production",
	entry: {
		main: "./"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		moduleIds: "natural",
		chunkIds: "natural",
		splitChunks: {
			cacheGroups: {
				default: false,
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					chunks: "initial",
					enforce: true,
					name: "vendors"
				}
			}
		}
	},
	stats
};
