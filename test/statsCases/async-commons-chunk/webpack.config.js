var webpack = require("../../../");

module.exports = {
	mode: "production",
	entry: "./",
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			name: "main",
			async: true
		})
	],
	stats: {
		hash: false,
		timings: false,
		assets: false,
		chunks: true,
		chunkOrigins: true,
		modules: false
	}
};
