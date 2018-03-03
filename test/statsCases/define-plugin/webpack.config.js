var webpack = require("../../../");
module.exports = [
	{
		mode: "production",
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "123"
			})
		]
	},

	{
		mode: "production",
		entry: "./index",
		plugins: [
			new webpack.DefinePlugin({
				VALUE: "321"
			})
		]
	}
];
