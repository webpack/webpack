var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var moduleConfig = {
	loaders: [
		{
			test: /\.css$/,
			use: ExtractTextPlugin.extract({
				fallback: "style-loader",
				use: "css-loader"
			})
		}
	]
};

module.exports = [
	{
		context: path.join(__dirname, "a"),
		entry: "./index",
		output: {
			filename: "[chunkhash].js"
		},
		module: moduleConfig,
		plugins: [
			new ExtractTextPlugin("[contenthash].css")
		]
	},
	{
		context: path.join(__dirname, "b"),
		entry: "./index",
		output: {
			filename: "[chunkhash].js"
		},
		module: moduleConfig,
		plugins: [
			new ExtractTextPlugin("[contenthash].css")
		]
	}
];
