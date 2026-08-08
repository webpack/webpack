"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.data\.js$/,
				loader: require.resolve("./loader.js")
			}
		]
	}
};
