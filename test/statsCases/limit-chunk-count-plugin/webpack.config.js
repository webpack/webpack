var webpack = require("../../../");
module.exports = [1, 2, 3, 4].map(n => ({
	name: `${n} chunks`,
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin({
			maxChunks: n
		})
	],
	stats: {
		chunkModules: true,
		modules: false,
		chunks: true
	}
}));
