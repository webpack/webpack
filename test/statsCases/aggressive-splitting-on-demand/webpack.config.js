var webpack = require("../../../");
module.exports = {
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	entry: "./index",
	cache: true, // AggressiveSplittingPlugin rebuilds multiple times, we need to cache the assets
	output: {
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new webpack.optimize.AggressiveSplittingPlugin({
			minSize: 1500,
			maxSize: 2500
		})
	],
	recordsInputPath: __dirname + "/input-records.json",
	//recordsOutputPath: __dirname + "/records.json",
	stats: {
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
};
