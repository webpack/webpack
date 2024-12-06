const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: { import: "./index.js" }
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: "[name].css"
		})
	],
	module: {
		rules: [
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, "css-loader"]
			}
		]
	}
};
