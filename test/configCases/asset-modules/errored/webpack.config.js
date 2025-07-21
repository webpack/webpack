"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		hashDigestLength: 8
	},
	module: {
		rules: [
			{
				test: /\.css$/i,
				type: "asset/resource",
				generator: {
					filename: () => "css/style.[contenthash].css"
				},
				use: [
					{
						loader: require.resolve("./loader")
					}
				]
			}
		]
	}
};
