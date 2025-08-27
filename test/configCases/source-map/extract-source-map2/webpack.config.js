"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	entry: "./index",
	devtool: "source-map",
	module: {
		rules: [
			{
				test: /\.js$/,
				extractSourceMap: true,
				loader: require.resolve("./babel-loader")
			}
		]
	}
};
