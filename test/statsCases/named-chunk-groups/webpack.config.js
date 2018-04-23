const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: false,
	chunkGroups: true,
	modules: false
};
module.exports = {
	mode: "production",
	entry: {
		main: "./"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			minSize: 100,
			cacheGroups: {
				vendors: {
					test: /[\\/]node_modules[\\/]/,
					chunks: "async",
					enforce: true,
					name: "vendors"
				}
			}
		}
	},
	stats
};
