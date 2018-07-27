var webpack = require("../../../");
module.exports = ["fitting", "content-change"].map(type => ({
	name: type,
	mode: "production",
	optimization: { moduleIds: "natural", chunkIds: "natural" },
	cache: true, // AggressiveSplittingPlugin rebuilds multiple times, we need to cache the assets
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
	recordsInputPath: __dirname + `/input-records-${type}.json`,
	//recordsOutputPath: __dirname + `/records-${type}.json`,
	stats: {
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
}));
