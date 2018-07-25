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
			minSize: 100
		}
	},
	stats
};
