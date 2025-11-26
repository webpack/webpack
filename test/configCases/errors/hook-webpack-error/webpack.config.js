"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /my-errored-module\.js$/i,
				use: [
					{
						loader: require.resolve("./loader.js")
					}
				]
			}
		]
	}
};
