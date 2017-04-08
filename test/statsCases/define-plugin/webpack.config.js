var webpack = require("../../../");
module.exports = [
	{
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "123"
			})
		]
	},
	{
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "321"
			})
		]
	}
];
