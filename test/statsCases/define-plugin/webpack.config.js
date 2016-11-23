var webpack = require("../../../");
module.exports = [
	{
		entry: "./index",
		stats: "errors-only",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "123"
			})
		]
	},
	{
		entry: "./index",
		stats: "errors-only",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "321"
			})
		]
	}
];
