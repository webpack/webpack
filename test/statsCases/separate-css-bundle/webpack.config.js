var path = require("path");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var moduleConfig = {
	rules: [
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
		mode: "production",
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
		mode: "production",
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
