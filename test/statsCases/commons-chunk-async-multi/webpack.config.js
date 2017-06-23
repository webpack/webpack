var CommonsChunkPlugin = require("../../../lib/optimize/CommonsChunkPlugin");

module.exports = {
	entry: {
		"main-1": ["./entry-1"],
		"main-2": ["./entry-2"]
	},
	output: {
		chunkFilename: "chunk.[name].js"
	},
	stats: {
		chunks: true,
		context: __dirname
	},
	plugins: [
		new CommonsChunkPlugin({
			async: "commons",
			names: ["main-2", "main-1"],
		})
	]
};
