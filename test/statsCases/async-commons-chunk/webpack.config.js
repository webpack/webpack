module.exports = {
	mode: "production",
	entry: "./",
	optimization: {
		splitChunks: {
			minSize: 0
		}
	},
	stats: {
		hash: false,
		timings: false,
		builtAt: false,
		assets: false,
		chunks: true,
		chunkOrigins: true,
		modules: false
	}
};
