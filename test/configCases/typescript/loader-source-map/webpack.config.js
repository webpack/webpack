"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: "source-map",
	entry: "./index.ts",
	experiments: {
		typescript: true
	},
	module: {
		rules: [
			{
				test: /data\.ts$/,
				use: [require.resolve("./loader/banner-loader.js")]
			}
		]
	}
};
