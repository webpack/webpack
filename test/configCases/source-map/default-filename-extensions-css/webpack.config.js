const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		filename: "bundle0.js"
	},
	node: {
		__dirname: false,
		__filename: false
	},
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [
					MiniCssExtractPlugin.loader,
					{
						loader: "css-loader",
						options: {
							sourceMap: true
						}
					}
				]
			}
		]
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "style.css",
			chunkFilename: "[id].css"
		})
	]
};
