const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		light: { import: "./light.js", layer: "light" },
		dark: { import: "./dark.js", layer: "dark" }
	},
	experiments: {
		layers: true
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
				test: /\.less$/i,
				oneOf: [
					{
						issuerLayer: "light",
						use: [
							MiniCssExtractPlugin.loader,
							"css-loader",
							{
								loader: "less-loader",
								options: {
									additionalData: "@color: white;"
								}
							}
						]
					},
					{
						issuerLayer: "dark",
						use: [
							MiniCssExtractPlugin.loader,
							"css-loader",
							{
								loader: "less-loader",
								options: {
									additionalData: "@color: black;"
								}
							}
						]
					}
				]
			}
		]
	}
};
