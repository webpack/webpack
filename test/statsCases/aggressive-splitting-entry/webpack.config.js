const AggressiveSplittingPlugin = require("../../../lib/optimize/AggressiveSplittingPlugin");

module.exports = ["fitting", "content-change"].map(type => ({
	name: type,
	mode: "production",
	cache: true, // AggressiveSplittingPlugin rebuilds multiple times, we need to cache the assets
	entry: "./index",
	output: {
		filename: "[chunkhash].js",
		chunkFilename: "[chunkhash].js"
	},
	plugins: [
		new AggressiveSplittingPlugin({
			chunkOverhead: 0,
			entryChunkMultiplicator: 1,
			minSize: 1500,
			maxSize: 2500
		})
	],
	recordsInputPath: __dirname + `/input-records-${type}.json`,
	stats: {
		chunks: true,
		chunkModules: true,
		chunkOrigins: true,
		entrypoints: true,
		modules: false,
		publicPath: true
	}
}));

