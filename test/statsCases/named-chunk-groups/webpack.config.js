const stats = {
	hash: false,
	timings: false,
	builtAt: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	modules: false
};

const config = {
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
	}
};

module.exports = [
	Object.assign(
		{
			stats: Object.assign({ entrypoints: false, chunkGroups: true }, stats)
		},
		config
	),
	Object.assign(
		{
			stats: Object.assign({ entrypoints: true, chunkGroups: true }, stats)
		},
		config
	)
];
