var webpack = require("../../../");

module.exports = {
	entry: {
		entry: "./"
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
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
