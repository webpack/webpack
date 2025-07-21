"use strict";

/** @type {import('webpack').Configuration} */
const config = {
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/,
				use: [
					{
						loader: require.resolve("./loader.js")
					}
				]
			}
		]
	}
};

module.exports = config;
