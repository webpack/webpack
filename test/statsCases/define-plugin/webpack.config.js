var webpack = require("../../../");
var fs = require("fs");
var join = require("path").join;

function read(path) {
	return JSON.stringify(fs.readFileSync(join(__dirname, path), "utf8"));
}

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
	},

	{
		mode: "production",
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: webpack.DefinePlugin.runtimeValue(() => read("123.txt"), [
					"./123.txt"
				])
			}),
			new webpack.DefinePlugin({
				VALUE: webpack.DefinePlugin.runtimeValue(() => read("321.txt"), [
					"./321.txt"
				])
			})
		]
	}
];
