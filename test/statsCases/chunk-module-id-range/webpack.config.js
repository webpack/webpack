const webpack = require("../../../");

module.exports = {
	mode: "none",
	entry: {
		main1: "./main1",
		main2: "./main2"
	},
	plugins: [
		new webpack.optimize.ChunkModuleIdRangePlugin({
			name: "main1",
			start: 100,
			end: 102
		}),
		new webpack.optimize.ChunkModuleIdRangePlugin({
			name: "main2",
			order: "index2"
		})
	],
	stats: {
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
};
