"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	entry: "./index.js",
	module: {
		rules: [
			// Two loaders: the BOM goes in `LoaderRunner`'s `convertArgs`, and the
			// map handed on is JSON.
			{
				test: /chained\.js$/,
				use: [
					require.resolve("./next-loader.js"),
					{
						loader: require.resolve("./bom-loader.js"),
						options: { stringifyMap: true }
					}
				]
			},
			// One loader: the BOM goes in the `processResult` tap instead.
			{
				test: /direct\.js$/,
				use: [require.resolve("./bom-loader.js")]
			}
		]
	}
};
