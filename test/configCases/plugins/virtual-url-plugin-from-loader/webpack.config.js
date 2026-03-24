"use strict";

/** @type {import("webpack").Configuration} */
const config = {
	// No VirtualUrlPlugin in config — loaders register it dynamically
	plugins: [],
	module: {
		rules: [
			{
				test: /source\.js$/,
				// Webpack applies use[] right-to-left: loader-b runs first, loader-a second
				use: [
					require.resolve("./loader-a.js"),
					require.resolve("./loader-b.js")
				]
			}
		]
	}
};

module.exports = config;
