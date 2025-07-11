const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	entry: "./index.js",
	mode: "development",
	optimization: {
		concatenateModules: false
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				use: [
					{
						loader: MiniCssExtractPlugin.loader
					},
					{
						loader: "css-loader",
						options: {
							esModule: true,
							modules: {
								namedExport: false,
								localIdentName: "[name]"
							}
						}
					}
				]
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css"
		})
	],
	node: {
		__dirname: false,
		__filename: false
	}
};
