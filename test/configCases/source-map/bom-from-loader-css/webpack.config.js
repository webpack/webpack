"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: "source-map",
	entry: "./index.js",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /style\.css$/,
				use: [require.resolve("../bom-from-loader-counting-map/bom-loader.js")]
			}
		]
	}
};
