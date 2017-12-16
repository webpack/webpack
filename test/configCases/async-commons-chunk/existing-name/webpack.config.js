var webpack = require("../../../../");

module.exports = {
	performance: {
		hints: false
	},
	plugins: [
		new webpack.optimize.CommonsChunkPlugin({
			chunks: ["a+b", "a+b+c"],
			async: "a+b",
		}),
		new webpack.optimize.CommonsChunkPlugin({
			chunks: ["a", "a+b"],
			async: "a",
		}),
		new webpack.NamedChunksPlugin()
	]
};
