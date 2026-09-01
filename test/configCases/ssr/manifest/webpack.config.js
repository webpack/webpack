"use strict";

const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { SSRManifestPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	optimization: { minimize: false },
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [MiniCssExtractPlugin.loader, "css-loader"]
			},
			{
				test: /\.svg$/,
				type: "asset/resource"
			}
		]
	},
	plugins: [new MiniCssExtractPlugin(), new SSRManifestPlugin()]
};
