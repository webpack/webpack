const webpack = require("../../../");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "none",
	entry: {
		main1: "./main1",
		main2: "./main2"
	},
	plugins: [
		new webpack.ids.ChunkModuleIdRangePlugin({
			name: "main1",
			start: 100,
			end: 102
		}),
		new webpack.ids.ChunkModuleIdRangePlugin({
			name: "main2",
			order: "postOrderIndex"
		})
	],
	stats: {
		chunks: true,
		chunkModules: true,
		dependentModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
};
