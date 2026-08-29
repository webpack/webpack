"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: "source-map",
	entry: "./index.js",
	module: {
		rules: [
			{
				test: /mod\.js$/,
				use: [
					require.resolve("./next-loader.js"),
					require.resolve("./bom-loader.js")
				]
			}
		]
	}
};
