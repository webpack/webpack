"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /broken\.js$/,
				use: require.resolve("./loader.js")
			},
			{
				test: /non-buffer\.js$/,
				use: require.resolve("./non-buffer-loader.js")
			}
		]
	}
};
