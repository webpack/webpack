var webpack = require("../../../");
module.exports = [
	{
		mode: "production",
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "123",
				SERVER: true,
				CHUNK_INFO: {
					chunkName: JSON.stringify("foo"),
					contextChunkName: () => "contextChunk",
					contextInclude: /\.js$/,
					contextExclude: /huge\.js$/
				}
			})
		]
	},
	{
		mode: "production",
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "321",
				SERVER: false,
				CHUNK_INFO: {
					chunkName: JSON.stringify("bar"),
					contextChunkName: () => "anotherContextChunk",
					contextInclude: /empty\.js$/,
					contextExclude: /huge\.js$/
				}
			})
		]
	}
];
