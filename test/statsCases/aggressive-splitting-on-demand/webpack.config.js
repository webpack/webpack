var webpack = require("../../../");
module.exports = {
	entry: "./index",
	output: {
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			chunkOverhead: 0,
			entryChunkMultiplicator: 1,
			minSize: 1500,
			maxSize: 2500
		})
	],
	recordsInputPath: __dirname + "/input-records.json",
	//recordsOutputPath: __dirname + "/records.json",
	stats: {
		reasons: false,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		cached: true,
		cachedAssets: true,
		source: true,
		errorDetails: true,
		publicPath: true,
		excludeModules: [
			/e\.js/
		]
	}
};
